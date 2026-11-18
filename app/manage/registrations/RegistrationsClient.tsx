"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Registration, type UserRow, type Workshop } from "../../../lib/api";
import { dateDialog, dateShort, errorText, isPast } from "../../../lib/format";
import { useToday } from "../../../lib/hooks";
import { AdminGate } from "../../components/AdminGate";
import { ChangeWorkshopDialog, ConfirmDialog, moveTargets } from "../../components/Dialogs";
import { Avatar, Pagination, StatePanel, paginate } from "../../components/ui";

const PAGE_SIZE = 5;

export function RegistrationsClient() {
  return (
    <AdminGate title="Manage Registrations" next="/manage/registrations">
      <ManageRegistrations />
    </AdminGate>
  );
}

function ManageRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const today = useToday();
  const [workshopFilter, setWorkshopFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState<Registration | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([api.listRegistrations(), api.listWorkshops(), api.listUsers()])
        .then(
          ([regs, ws, us]) => {
            setRegistrations(regs.data);
            setWorkshops(ws.data);
            setUsers(us.data);
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

  // Newest registration first.
  const shown = useMemo(
    () =>
      registrations
        .filter((r) => !workshopFilter || r.workshop?._id === workshopFilter)
        .filter((r) => !userFilter || r.user?._id === userFilter)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [registrations, workshopFilter, userFilter],
  );
  const { total, current, items } = paginate(shown, page, PAGE_SIZE);

  // Filter options: every workshop and user, plus names that only appear in a
  // registration (a removed workshop). A chosen option never drops out of the
  // list after a delete, so the pill always names the active filter.
  const workshopOptions = useMemo(() => {
    const map = new Map<string, string>(workshops.map((w) => [w._id, w.name]));
    registrations.forEach((r) => r.workshop && !map.has(r.workshop._id) && map.set(r.workshop._id, `${r.workshop.name} (removed)`));
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [workshops, registrations]);
  const userOptions = useMemo(() => {
    const map = new Map<string, string>(users.map((u) => [u._id, u.name]));
    registrations.forEach((r) => r.user && !map.has(r.user._id) && map.set(r.user._id, r.user.name));
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [users, registrations]);

  const heldBy = (userId: string | undefined) => new Set(registrations.filter((r) => r.user?._id === userId).map((r) => r.workshop?._id).filter(Boolean) as string[]);

  return (
    <div className="page">
      <h1 className="t-display-l">Manage Registrations</h1>

      <div className="row" style={{ gap: 8 }}>
        <span className="spacer" />
        <FilterPill label="Workshop" value={workshopFilter} options={workshopOptions} onChange={(v) => { setWorkshopFilter(v); setPage(1); }} />
        <FilterPill label="User" value={userFilter} options={userOptions} onChange={(v) => { setUserFilter(v); setPage(1); }} />
      </div>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {notice ?? ""}
      </p>

      {!loaded ? (
        <StatePanel title="Loading registrations…" dashed />
      ) : (
        <div className="dtable-wrap">
          <div className="dtable-scroll">
            <table className="dtable" style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  <th style={{ width: 324 }}>Member</th>
                  <th>Workshop</th>
                  <th style={{ width: 170 }}>Workshop date</th>
                  <th style={{ width: 170 }}>Registered on</th>
                  <th style={{ width: 174 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="dtable-empty">
                      {registrations.length === 0 ? "No registrations yet." : "No registrations match these filters."}
                    </td>
                  </tr>
                ) : (
                  items.map((r) => {
                    const canMove = Boolean(r.workshop && r.workshop.isActive && today && !isPast(r.workshop, today));
                    return (
                      <tr key={r._id}>
                        <td>
                          {r.user ? (
                            <div className="member-cell">
                              <Avatar name={r.user.name} id={r.user._id} />
                              <div>
                                <span className="t-strong">{r.user.name}</span>
                                <span className="t-caption muted">{r.user.email}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="muted">Deleted user</span>
                          )}
                        </td>
                        <td>
                          {r.workshop ? r.workshop.name : <span className="muted">Deleted workshop</span>}
                          {r.workshop && !r.workshop.isActive && <span className="t-caption muted"> (removed)</span>}
                        </td>
                        <td className="cell-nowrap">{r.workshop ? dateShort(r.workshop.workshopDate) : "—"}</td>
                        <td className="cell-nowrap">{dateShort(r.createdAt)}</td>
                        <td>
                          <div className="cell-actions">
                            {canMove && (
                              <button type="button" className="link-action link-edit" onClick={() => setEditing(r)} aria-label={`Change workshop for ${r.user?.name ?? "this registration"}`}>
                                Edit
                              </button>
                            )}
                            <button type="button" className="link-action link-danger" onClick={() => setDeleting(r)} aria-label={`Delete registration of ${r.user?.name ?? "this user"}`}>
                              Delete
                            </button>
                          </div>
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

      <Pagination label="Registration table pages" page={current} total={total} onChange={setPage} />

      <ChangeWorkshopDialog
        open={editing !== null}
        currentName={editing?.workshop?.name ?? ""}
        who={editing?.user?.name ? `${editing.user.name}’s seat` : "this seat"}
        targets={editing && today ? moveTargets(workshops, today, heldBy(editing.user?._id)) : []}
        onClose={() => setEditing(null)}
        onSave={async (workshopId) => {
          if (!editing) return;
          await api.updateRegistration(editing._id, workshopId);
          setEditing(null);
          setNotice("Registration moved.");
          await load();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this registration?"
        body={
          deleting && (
            <>
              <strong>{deleting.user?.name ?? "This user"}</strong> will lose the seat in <strong>{deleting.workshop?.name ?? "this workshop"}</strong>
              {deleting.workshop ? ` (${dateDialog(deleting.workshop.workshopDate)})` : ""}.
            </>
          )
        }
        safeLabel="Keep it"
        dangerLabel="Yes, delete"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await api.deleteRegistration(deleting._id);
          setDeleting(null);
          setNotice("Registration deleted.");
          await load();
        }}
      />

    </div>
  );
}

// Figma: "Workshop: All ▾" / "User: All ▾" — a native select drawn as a boxed pill.
function FilterPill({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const selected = options.find(([id]) => id === value)?.[1] ?? "All";
  return (
    <label className="select-pill select-pill-boxed">
      <span aria-hidden style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}: {selected}
        <span className="caret">▾</span>
      </span>
      <select aria-label={`Filter by ${label.toLowerCase()}`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
