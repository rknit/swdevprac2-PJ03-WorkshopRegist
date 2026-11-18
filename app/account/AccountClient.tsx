"use client";

import { useCallback, useEffect, useState } from "react";
import { api, fmtDate, type Registration, type Workshop } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export function AccountClient() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string; id: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [regs, ws] = await Promise.all([api.listRegistrations(), api.listWorkshops()]);
      setRegistrations(regs.data);
      setWorkshops(ws.data);
      if (user?.role === "admin") {
        const us = await api.listUsers();
        setUsers(us.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) void load();
    else setLoaded(true);
  }, [user, load]);

  const changeWorkshop = async (id: string, newWorkshopId: string) => {
    if (!newWorkshopId) return;
    setBusyId(id);
    setResult(null);
    try {
      const res = await api.updateRegistration(id, newWorkshopId);
      setResult({ ok: true, text: `Registration ${id} moved to workshop ${res.data.workshop?.name ?? newWorkshopId}.`, id });
      await load();
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : String(e), id });
    } finally {
      setBusyId(null);
    }
  };

  const del = async (id: string) => {
    setBusyId(id);
    setResult(null);
    try {
      await api.deleteRegistration(id);
      setResult({ ok: true, text: `Registration ${id} deleted.`, id: null });
      await load();
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : String(e), id: null });
    } finally {
      setBusyId(null);
    }
  };

  // Admins can create a registration for a named user.
  const [users, setUsers] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [newUser, setNewUser] = useState("");
  const [newWorkshop, setNewWorkshop] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createResult, setCreateResult] = useState<{ ok: boolean; text: string } | null>(null);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser || !newWorkshop) return;
    setCreateBusy(true);
    setCreateResult(null);
    try {
      const res = await api.createRegistration(newWorkshop, newUser);
      setCreateResult({ ok: true, text: `Registration created for ${newUser}. id: ${res.data._id}` });
      setNewWorkshop("");
      await load();
    } catch (err) {
      setCreateResult({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setCreateBusy(false);
    }
  };

  if (!loaded) return <p>Loading…</p>;
  if (!user) {
    return (
      <div>
        <h1>My registrations</h1>
        <p className="error">Log in to view registrations.</p>
      </div>
    );
  }
  const isAdmin = user.role === "admin";

  return (
    <div>
      <h1>{isAdmin ? "All registrations (admin)" : "My registrations"}</h1>
      <p>
        {isAdmin
          ? "Admins can edit or delete any user's registration."
          : "Members can edit or delete their own registrations. A member may have at most 3 active registrations, one per workshop."}
      </p>
      {error && <p className="error">{error}</p>}
      {result && <p className={result.ok ? "ok" : "error"}>{result.text}</p>}
      {registrations.length === 0 ? (
        <p>No registrations yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Registration id</th>
              {isAdmin && <th>User</th>}
              <th>Workshop</th>
              <th>Workshop date</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r._id}>
                <td><code>{r._id}</code></td>
                {isAdmin && (
                  <td>
                    {r.user ? (
                      <>
                        {r.user.name} ({r.user.email}) <code>{r.user._id}</code>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td>
                  {r.workshop ? (
                    <>
                      {r.workshop.name}{" "}
                      <code>{r.workshop._id}</code>
                    </>
                  ) : (
                    "deleted workshop"
                  )}
                </td>
                <td>{r.workshop ? fmtDate(r.workshop.workshopDate) : "—"}</td>
                <td>{fmtDate(r.createdAt)}</td>
                <td>
                  <label className="field" style={{ display: "inline-block", width: "10rem" }}>
                    Move to
                    <select id={`move-${r._id}`} defaultValue="">
                      <option value="">—</option>
                      {workshops.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </label>{" "}
                  <button
                    disabled={busyId === r._id}
                    onClick={() =>
                      void changeWorkshop(r._id, (document.getElementById(`move-${r._id}`) as HTMLSelectElement | null)?.value ?? "")
                    }
                  >
                    Edit
                  </button>{" "}
                  <button disabled={busyId === r._id} onClick={() => void del(r._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {isAdmin && (
        <div className="card">
          <h2>Create a registration for a user</h2>
          <p>Pick the user by ID (listed in the table above) and the workshop.</p>
          {createResult && <p className={createResult.ok ? "ok" : "error"}>{createResult.text}</p>}
          <form onSubmit={(e) => void submitCreate(e)} className="row">
            <label className="field">
              User ID
              <select value={newUser} onChange={(e) => setNewUser(e.target.value)} required>
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Workshop
              <select value={newWorkshop} onChange={(e) => setNewWorkshop(e.target.value)} required>
                <option value="">—</option>
                {workshops.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={createBusy}>{createBusy ? "Creating…" : "Create"}</button>
          </form>
        </div>
      )}
    </div>
  );
}