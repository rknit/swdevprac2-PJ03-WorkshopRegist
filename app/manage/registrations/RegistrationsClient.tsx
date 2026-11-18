"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Registration, type UserRow, type Workshop } from "../../../lib/api";
import { dateDialog, dateShort, errorText, isFull, isPast, seatsLeft, whenLabel } from "../../../lib/format";
import { useToday } from "../../../lib/hooks";
import { AdminGate } from "../../components/AdminGate";
import { ConfirmDialog, EditRegistrationDialog, moveTargets } from "../../components/Dialogs";
import { Avatar, Button, Dialog, Pagination, StatePanel, paginate } from "../../components/ui";

const PAGE_SIZE = 5;

export function RegistrationsClient() {
  return (
    <AdminGate title="Manage Registrations">
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
  const [creating, setCreating] = useState(false);
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
      <div className="page-head">
        <h1 className="t-display-l">Manage Registrations</h1>
        <Button onClick={() => setCreating(true)}>+ New registration</Button>
      </div>

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

      <EditRegistrationDialog
        open={editing !== null}
        currentName={editing?.workshop?.name ?? ""}
        member={editing?.user ? `${editing.user.name} (${editing.user.email})` : "Deleted user"}
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
        title="Delete registration?"
        body={
          deleting && (
            <>
              Remove the seat of <strong>{deleting.user?.name ?? "this member"}</strong> in <strong>{deleting.workshop?.name ?? "this workshop"}</strong>
              {deleting.workshop ? ` (${dateDialog(deleting.workshop.workshopDate)})` : ""}.
            </>
          )
        }
        safeLabel="Cancel"
        dangerLabel="Delete"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await api.deleteRegistration(deleting._id);
          setDeleting(null);
          setNotice("Registration deleted.");
          await load();
        }}
      />

      <NewRegistrationDialog
        open={creating}
        users={users.filter((u) => u.role === "member")}
        workshops={today ? workshops.filter((w) => w.isActive && !isPast(w, today)).sort((a, b) => Date.parse(a.workshopDate) - Date.parse(b.workshopDate)) : []}
        onClose={() => setCreating(false)}
        onCreate={async (userId, workshopId, ignoreCapacity) => {
          await api.createRegistration(workshopId, userId, ignoreCapacity);
          setCreating(false);
          setNotice("Registration created.");
          await load();
        }}
      />
    </div>
  );
}

// Flow 5 (22.3): "New registration" — member, workshop, and "Ignore Capacity".
// Ignore Capacity lets the admin add a seat to a full workshop; the duplicate,
// past-date, and 3-active rules still apply on the server.
function NewRegistrationDialog({
  open,
  users,
  workshops,
  onClose,
  onCreate,
}: {
  open: boolean;
  users: UserRow[];
  workshops: Workshop[];
  onClose: () => void;
  onCreate: (userId: string, workshopId: string, ignoreCapacity: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={busy ? () => undefined : onClose} title="New registration" bar="violet">
      {/* <Dialog> mounts this only while open, so the form starts empty each time. */}
      <NewRegistrationForm users={users} workshops={workshops} onClose={onClose} onCreate={onCreate} onBusy={setBusy} />
    </Dialog>
  );
}

function NewRegistrationForm({
  users,
  workshops,
  onClose,
  onCreate,
  onBusy,
}: {
  users: UserRow[];
  workshops: Workshop[];
  onClose: () => void;
  onCreate: (userId: string, workshopId: string, ignoreCapacity: boolean) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [userId, setUserId] = useState("");
  const [workshopId, setWorkshopId] = useState("");
  const [ignoreCapacity, setIgnoreCapacity] = useState(false);
  const [errors, setErrors] = useState<{ user?: string; workshop?: string; general?: string }>({});
  const [busy, setBusyLocal] = useState(false);
  const setBusy = (b: boolean) => {
    setBusyLocal(b);
    onBusy(b);
  };
  const chosen = workshops.find((w) => w._id === workshopId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = {
      user: userId ? undefined : "Pick a member.",
      workshop: !workshopId ? "Pick a workshop." : chosen && isFull(chosen) && !ignoreCapacity ? "This workshop is full. Tick Ignore Capacity to add the seat anyway." : undefined,
    };
    setErrors(found);
    if (found.user || found.workshop) return;
    setBusy(true);
    try {
      await onCreate(userId, workshopId, ignoreCapacity);
      onBusy(false);
    } catch (err) {
      setErrors({ general: errorText(err) });
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="field">
        <label className="field-label" htmlFor="new-reg-user">
          Member
        </label>
        <select id="new-reg-user" className="field-control" value={userId} onChange={(e) => setUserId(e.target.value)} aria-invalid={errors.user ? true : undefined}>
          <option value="">Select a member</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        {errors.user && (
          <p className="field-help" role="alert">
            {errors.user}
          </p>
        )}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="new-reg-workshop">
          Workshop name
        </label>
        <select
          id="new-reg-workshop"
          className="field-control"
          value={workshopId}
          onChange={(e) => {
            setWorkshopId(e.target.value);
            setErrors((x) => ({ ...x, workshop: undefined }));
          }}
          aria-invalid={errors.workshop ? true : undefined}
        >
          <option value="">Select a workshop</option>
          {workshops.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name} — {whenLabel(w)} ({isFull(w) ? "full" : `${seatsLeft(w)} left`})
            </option>
          ))}
        </select>
        {errors.workshop && (
          <p className="field-help" role="alert">
            {errors.workshop}
          </p>
        )}
      </div>
      {errors.general && (
        <p className="notice notice-error" role="alert">
          {errors.general}
        </p>
      )}
      <div className="dialog-actions" style={{ alignItems: "center" }}>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={ignoreCapacity}
            onChange={(e) => {
              setIgnoreCapacity(e.target.checked);
              setErrors((x) => ({ ...x, workshop: undefined }));
            }}
          />
          <span>Ignore Capacity</span>
        </label>
        <span className="spacer" />
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
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
