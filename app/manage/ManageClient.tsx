"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Workshop } from "../../lib/api";
import { bkkDay, dateDialog, dateShort, errorText, isFull, isPast, seatsTaken } from "../../lib/format";
import { useToday } from "../../lib/hooks";
import { AdminGate } from "../components/AdminGate";
import { ConfirmDialog } from "../components/Dialogs";
import { Badge, Button, CapacityBar, Drawer, Icon, Pagination, StatePanel, paginate, workshopStatus } from "../components/ui";

type FormState = {
  name: string;
  description: string;
  instructor: string;
  workshopDate: string;
  location: string;
  capacity: string;
  coverImage: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;
type Filter = "all" | "upcoming" | "ended" | "full";

const EMPTY: FormState = { name: "", description: "", instructor: "", workshopDate: "", location: "", capacity: "", coverImage: "" };
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ended", label: "Ended" },
  { key: "full", label: "Full" },
];
const PAGE_SIZE = 5;

// Same rule as the backend: an http(s) URL.
const isHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") && !/\s/.test(value);
  } catch {
    return false;
  }
};

export function ManageClient() {
  return (
    <AdminGate title="Manage workshops">
      <ManageWorkshops />
    </AdminGate>
  );
}

function ManageWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [regTotal, setRegTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const today = useToday();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<{ mode: "create" } | { mode: "edit"; workshop: Workshop } | null>(null);
  const [deleting, setDeleting] = useState<Workshop | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([api.listWorkshops(), api.listRegistrations()])
        .then(
          ([ws, regs]) => {
            setWorkshops(ws.data);
            setRegTotal(regs.count ?? regs.data.length);
            setError(null);
            return ws.data;
          },
          (e) => {
            setError(errorText(e));
            return [] as Workshop[];
          },
        )
        .finally(() => setLoaded(true)),
    [],
  );

  useEffect(() => {
    void load().then((list) => {
      // "Edit workshop" on the detail page links here with ?edit=<id>.
      const id = new URLSearchParams(window.location.search).get("edit");
      if (!id) return;
      const target = list.find((w) => w._id === id);
      if (target) setDrawer({ mode: "edit", workshop: target });
      window.history.replaceState(null, "", "/manage");
    });
  }, [load]);

  const upcomingCount = today ? workshops.filter((w) => !isPast(w, today)).length : 0;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workshops
      .filter((w) => !q || [w.name, w.instructor, w.location, w.description].some((f) => f.toLowerCase().includes(q)))
      .filter((w) => {
        if (filter === "all" || !today) return true;
        if (filter === "upcoming") return !isPast(w, today);
        if (filter === "ended") return isPast(w, today);
        return isFull(w);
      });
  }, [workshops, query, filter, today]);

  const { total, current, items } = paginate(shown, page, PAGE_SIZE);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="t-display-l">Manage workshops</h1>
        <Button onClick={() => setDrawer({ mode: "create" })}>+ New workshop</Button>
      </div>

      <div className="stats">
        <div className="stat" style={{ background: "var(--sun)" }}>
          <span className="t-label">Workshops</span>
          <span className="t-display-l">{loaded ? workshops.length : "–"}</span>
        </div>
        <div className="stat" style={{ background: "var(--mint)" }}>
          <span className="t-label">Upcoming</span>
          <span className="t-display-l">{loaded && today ? upcomingCount : "–"}</span>
        </div>
        <div className="stat" style={{ background: "var(--sky)" }}>
          <span className="t-label">Registrations</span>
          <span className="t-display-l">{regTotal ?? "–"}</span>
        </div>
      </div>

      <div className="row">
        <label className="searchbox">
          <Icon name="search" size={18} />
          <span className="sr-only">Search workshops</span>
          <input
            type="search"
            placeholder="Search workshops"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="chips" role="group" aria-label="Filter workshops" style={{ gap: 12 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="chip chip-sm"
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
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
        <StatePanel title="Loading workshops…" dashed />
      ) : (
        <div className="dtable-wrap">
          <div className="dtable-scroll">
            <table className="dtable" style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={{ width: 344 }}>Workshop</th>
                  <th style={{ width: 160 }}>Date</th>
                  <th style={{ width: 200 }}>Instructor</th>
                  <th style={{ width: 200 }}>Location</th>
                  <th style={{ width: 150 }}>Seats</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="dtable-empty">
                      {workshops.length === 0 ? "No workshops yet. Add the first one with “+ New workshop”." : "No workshops match this search or filter."}
                    </td>
                  </tr>
                ) : (
                  items.map((w) => {
                    const status = workshopStatus(w, today);
                    return (
                      <tr key={w._id}>
                        <td className="cell-strong">{w.name}</td>
                        <td className="cell-nowrap">{dateShort(w.workshopDate)}</td>
                        <td>{w.instructor}</td>
                        <td>{w.location}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span className="t-caption">
                              {seatsTaken(w)} / {w.capacity}
                            </span>
                            <CapacityBar workshop={w} small />
                          </div>
                        </td>
                        <td>
                          <Badge status={status.status === "few" ? "open" : status.status}>{status.status === "few" ? "Open" : status.label}</Badge>
                        </td>
                        <td>
                          <div className="cell-actions">
                            <button type="button" className="link-action link-edit" onClick={() => setDrawer({ mode: "edit", workshop: w })} aria-label={`Edit ${w.name}`}>
                              Edit
                            </button>
                            <button type="button" className="link-action link-danger" onClick={() => setDeleting(w)} aria-label={`Delete ${w.name}`}>
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

      <Pagination label="Workshop table pages" page={current} total={total} onChange={setPage} />

      <WorkshopDrawer
        state={drawer}
        today={today}
        onClose={() => setDrawer(null)}
        onDelete={(w) => {
          setDrawer(null);
          setDeleting(w);
        }}
        onSaved={async (saved, mode) => {
          setDrawer(null);
          setNotice(mode === "create" ? `Workshop ${saved.name} created. ID ${saved._id}.` : `Workshop ${saved.name} saved.`);
          await load();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Remove this workshop?"
        body={
          deleting && (
            <>
              <strong>{deleting.name}</strong> ({dateDialog(deleting.workshopDate)}) will be permanently removed.
            </>
          )
        }
        safeLabel="Cancel"
        dangerLabel="Remove"
        safeVariant="primary"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await api.deleteWorkshop(deleting._id);
          setNotice(`Workshop ${deleting.name} removed.`);
          setDeleting(null);
          await load();
        }}
      />
    </div>
  );
}

// Figma: "Drawer · Edit workshop". The same drawer creates a new workshop.
function WorkshopDrawer({
  state,
  today,
  onClose,
  onDelete,
  onSaved,
}: {
  state: { mode: "create" } | { mode: "edit"; workshop: Workshop } | null;
  today: string;
  onClose: () => void;
  onDelete: (w: Workshop) => void;
  onSaved: (w: Workshop, mode: "create" | "edit") => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const editing = state?.mode === "edit" ? state.workshop : null;
  return (
    <Drawer open={state !== null} onClose={busy ? () => undefined : onClose} labelledBy="drawer-title">
      {/* <Drawer> mounts this only while open, and the key gives each workshop a fresh form. */}
      <WorkshopForm key={editing?._id ?? "new"} editing={editing} today={today} onClose={onClose} onDelete={onDelete} onSaved={onSaved} onBusy={setBusy} />
    </Drawer>
  );
}

const formFrom = (w: Workshop | null): FormState =>
  w
    ? {
        name: w.name,
        description: w.description,
        instructor: w.instructor,
        workshopDate: bkkDay(w.workshopDate),
        location: w.location,
        capacity: String(w.capacity),
        coverImage: w.coverImage ?? "",
      }
    : EMPTY;

function WorkshopForm({
  editing,
  today,
  onClose,
  onDelete,
  onSaved,
  onBusy,
}: {
  editing: Workshop | null;
  today: string;
  onClose: () => void;
  onDelete: (w: Workshop) => void;
  onSaved: (w: Workshop, mode: "create" | "edit") => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formFrom(editing));
  const [errors, setErrors] = useState<FormErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusyLocal] = useState(false);
  const setBusy = (b: boolean) => {
    setBusyLocal(b);
    onBusy(b);
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Enter a workshop name.";
    if (!form.description.trim()) e.description = "Enter a description.";
    if (!form.instructor.trim()) e.instructor = "Enter the instructor.";
    if (!form.location.trim()) e.location = "Enter the location.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.workshopDate)) e.workshopDate = "Pick a date.";
    // The backend rejects any change to a past date. An edit that keeps the old date is allowed.
    else if (today && form.workshopDate < today && !(editing && bkkDay(editing.workshopDate) === form.workshopDate)) e.workshopDate = "Pick today or a later date.";
    if (form.coverImage.trim() && !isHttpUrl(form.coverImage.trim())) e.coverImage = "Enter a full image link that starts with https://";
    const cap = Number(form.capacity);
    if (!Number.isInteger(cap) || cap < 1) e.capacity = "Enter a whole number, 1 or more.";
    else if (editing && cap < (editing.registeredCount ?? 0)) e.capacity = `${editing.registeredCount} seats are taken. Use ${editing.registeredCount} or more.`;
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneral(null);
    const found = validate();
    setErrors(found);
    const first = (Object.keys(EMPTY) as (keyof FormState)[]).find((k) => found[k]);
    if (first) {
      document.getElementById(`ws-${first}`)?.focus();
      return;
    }
    setBusy(true);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      instructor: form.instructor.trim(),
      location: form.location.trim(),
      capacity: Number(form.capacity),
      coverImage: form.coverImage.trim() || null,
    };
    // Send the date only when it changed, so an admin can still edit other fields of a past workshop.
    if (!editing || bkkDay(editing.workshopDate) !== form.workshopDate) body.workshopDate = form.workshopDate;
    try {
      const res = editing ? await api.updateWorkshop(editing._id, body) : await api.createWorkshop(body);
      onBusy(false);
      await onSaved(res.data, editing ? "edit" : "create");
    } catch (err) {
      const msg = errorText(err);
      if (/date/i.test(msg)) setErrors({ workshopDate: msg });
      else if (/capacity/i.test(msg)) setErrors({ capacity: msg });
      else if (/coverImage/i.test(msg)) setErrors({ coverImage: "Enter a full image link that starts with https://" });
      else setGeneral(msg);
      setBusy(false);
    }
  };

  const field = (key: keyof FormState, label: string, input: React.ReactNode, className = "field") => (
    <div className={className}>
      <label className="field-label" htmlFor={`ws-${key}`}>
        {label}
      </label>
      {input}
      {errors[key] && (
        <p id={`ws-${key}-help`} className="field-help" role="alert">
          {errors[key]}
        </p>
      )}
    </div>
  );
  const attrs = (key: keyof FormState) => ({
    id: `ws-${key}`,
    className: "field-control",
    value: form[key],
    onChange: set(key),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `ws-${key}-help` : undefined,
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* The heading takes the first focus, so no field opens in its focus state. */}
      <h2 id="drawer-title" className="t-heading-m" tabIndex={-1} autoFocus style={{ outline: "none" }}>
        {editing ? "Edit workshop" : "New workshop"}
      </h2>
      {field("name", "Workshop name", <input {...attrs("name")} />)}
      {field("description", "Description", <textarea {...attrs("description")} rows={3} />)}
      {field("instructor", "Instructor", <input {...attrs("instructor")} />)}
      <div className="field-row">
        {field(
          "workshopDate",
          "Workshop date",
          // The design shows "12 Nov 2026". A native date input shows the browser's
          // format, so the box shows our text and an invisible date input sits on top.
          <div className="field-control date-control" aria-invalid={errors.workshopDate ? true : undefined}>
            <span className={form.workshopDate ? undefined : "muted"}>{form.workshopDate ? dateShort(`${form.workshopDate}T00:00:00Z`) : "Choose date"}</span>
            <input
              type="date"
              min={today || undefined}
              {...attrs("workshopDate")}
              className="date-native"
              onClick={(e) => e.currentTarget.showPicker?.()}
            />
          </div>,
        )}
        {field("capacity", "Capacity", <input type="number" min={1} step={1} inputMode="numeric" {...attrs("capacity")} />)}
      </div>
      {field("location", "Location", <input {...attrs("location")} />)}
      {field("coverImage", "Banner image URL", <input type="url" inputMode="url" placeholder="https://" {...attrs("coverImage")} />)}
      {general && (
        <p className="notice notice-error" role="alert">
          {general}
        </p>
      )}
      <div className="drawer-foot">
        {editing && (
          <button type="button" className="link-action link-danger" onClick={() => onDelete(editing)} disabled={busy}>
            Delete workshop
          </button>
        )}
        <span className="spacer" />
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Create"}
        </Button>
      </div>
    </form>
  );
}
