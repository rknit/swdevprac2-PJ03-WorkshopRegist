"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type UserRow } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { errorText } from "../../../lib/format";
import { AdminGate } from "../../components/AdminGate";
import { Avatar, Button, Dialog, StatePanel } from "../../components/ui";

const MAX_ACTIVE = 3;

export function UsersClient() {
  return (
    <AdminGate title="Manage Users">
      <ManageUsers />
    </AdminGate>
  );
}

// Figma: "08 · Admin — Users". The admin role is given or taken only here
// (PUT /users/:id/role). Sign-up always creates a member.
function ManageUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleFor, setRoleFor] = useState<UserRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api
        .listUsers()
        .then(
          (res) => {
            setUsers(res.data);
            setError(null);
          },
          (e) => setError(errorText(e)),
        )
        .finally(() => setLoaded(true)),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Flow 6 (23.1): "Apply" in the role dialog. Errors stay in the dialog.
  const applyRole = async (u: UserRow, role: "member" | "admin") => {
    if (role !== u.role) {
      setBusyId(u._id);
      try {
        await api.setRole(u._id, role);
        setNotice(`${u.name} is now ${role === "admin" ? "an admin" : "a member"}.`);
        await load();
      } finally {
        setBusyId(null);
      }
    }
    setRoleFor(null);
  };

  return (
    <div className="page">
      <h1 className="t-display-l">Manage Users</h1>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {notice ?? ""}
      </p>

      {!loaded ? (
        <StatePanel title="Loading users…" dashed />
      ) : (
        <div className="dtable-wrap">
          <div className="dtable-scroll">
            <table className="dtable" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ width: 384 }}>Member</th>
                  <th style={{ width: 300 }}>Phone</th>
                  <th style={{ width: 300 }}>Active seats</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="dtable-empty">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const self = u._id === me?.id;
                    return (
                      <tr key={u._id}>
                        <td>
                          <div className="member-cell">
                            <Avatar name={u.name} id={u._id} />
                            <div>
                              <span className="t-strong">{u.name}</span>
                              <span className="t-caption muted">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="cell-nowrap">{u.tel}</td>
                        <td className="cell-nowrap">
                          {u.activeSeats ?? 0} / {MAX_ACTIVE}
                        </td>
                        <td>
                          {/* Flow 6: "Press Role" opens the role dialog. An admin cannot change their own role. */}
                          <button
                            type="button"
                            className={u.role === "admin" ? "role-pill is-admin" : "role-pill"}
                            aria-label={`Role for ${u.name}: ${u.role === "admin" ? "Admin" : "Member"}. Change role`}
                            title={self ? "You cannot change your own role." : undefined}
                            disabled={self || busyId === u._id}
                            onClick={() => setRoleFor(u)}
                          >
                            {busyId === u._id ? "Saving…" : u.role === "admin" ? "Admin" : "Member"}
                            <span className="caret" aria-hidden>
                              ▾
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={roleFor !== null} onClose={busyId ? () => undefined : () => setRoleFor(null)} title="Change role for selected user" bar="violet">
        {roleFor && <RoleForm user={roleFor} onClose={() => setRoleFor(null)} onApply={(role) => applyRole(roleFor, role)} />}
      </Dialog>
    </div>
  );
}

// Flow 6 (23.1): Role field showing the choice, Member / Admin options, Apply.
function RoleForm({ user, onClose, onApply }: { user: UserRow; onClose: () => void; onApply: (role: "member" | "admin") => Promise<void> }) {
  const [role, setRole] = useState<"member" | "admin">(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = (r: "member" | "admin") => (r === "admin" ? "Admin" : "Member");

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onApply(role);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void apply(e)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p className="t-body muted">
        {user.name} ({user.email})
      </p>
      <div className="field">
        <label className="field-label" htmlFor="role-current">
          Role
        </label>
        <input id="role-current" className="field-control" value={label(role)} readOnly />
      </div>
      <div className="chips" role="radiogroup" aria-label="Role">
        {(["member", "admin"] as const).map((r) => (
          <button key={r} type="button" role="radio" aria-checked={role === r} className="chip" onClick={() => setRole(r)}>
            {label(r)}
          </button>
        ))}
      </div>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="dark" disabled={busy}>
          {busy ? "Applying…" : "Apply"}
        </Button>
      </div>
    </form>
  );
}
