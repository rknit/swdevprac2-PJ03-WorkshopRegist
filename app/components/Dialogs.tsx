"use client";

import { useState, type ReactNode } from "react";
import type { Attendance, Registration } from "../../lib/api";
import { ATTENDANCE_LABEL, attendanceOpen, errorText, whenLabel } from "../../lib/format";
import { Button, Dialog } from "./ui";

// <Dialog> mounts its children only while open, so each body below starts
// with fresh state every time its dialog opens.

// Figma: "Dialog · Cancel registration" and "Dialog · Delete workshop".
// The caller sets the button labels and order, because the two Figma dialogs differ:
// the cancel dialog shows the safe choice first in white, the delete dialog shows it first in coral.
export function ConfirmDialog({
  open,
  title,
  body,
  safeLabel,
  dangerLabel,
  safeVariant = "secondary",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  safeLabel: string;
  dangerLabel: string;
  safeVariant?: "primary" | "secondary";
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={busy ? () => undefined : onClose} title={title}>
      <ConfirmBody body={body} safeLabel={safeLabel} dangerLabel={dangerLabel} safeVariant={safeVariant} onClose={onClose} onConfirm={onConfirm} onBusy={setBusy} />
    </Dialog>
  );
}

function ConfirmBody({
  body,
  safeLabel,
  dangerLabel,
  safeVariant,
  onClose,
  onConfirm,
  onBusy,
}: {
  body: ReactNode;
  safeLabel: string;
  dangerLabel: string;
  safeVariant: "primary" | "secondary";
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusyLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setBusy = (b: boolean) => {
    setBusyLocal(b);
    onBusy(b);
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onBusy(false);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <>
      <p className="t-body muted">{body}</p>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <Button variant={safeVariant} onClick={onClose} disabled={busy} autoFocus>
          {safeLabel}
        </Button>
        <Button variant={safeVariant === "primary" ? "secondary" : "primary"} onClick={() => void confirm()} disabled={busy}>
          {busy ? "Working…" : dangerLabel}
        </Button>
      </div>
    </>
  );
}

// Flow 3 (13.1.2) and Flow 5 (22.1): "Edit registration".
// Editable: the note (member and admin) and attendance (admin only, from the
// workshop day on). The workshop itself does not change: to switch, the member
// deletes the registration and registers again.
export function EditRegistrationDialog({
  registration,
  isAdmin,
  today,
  onClose,
  onSave,
}: {
  registration: Registration | null;
  isAdmin: boolean;
  today: string;
  onClose: () => void;
  onSave: (body: { note: string; attendance?: Attendance }) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={registration !== null} onClose={busy ? () => undefined : onClose} title="Edit registration" bar="violet">
      {registration && <EditRegistrationBody registration={registration} isAdmin={isAdmin} today={today} onClose={onClose} onSave={onSave} onBusy={setBusy} />}
    </Dialog>
  );
}

const NOTE_MAX = 300;

function EditRegistrationBody({
  registration,
  isAdmin,
  today,
  onClose,
  onSave,
  onBusy,
}: {
  registration: Registration;
  isAdmin: boolean;
  today: string;
  onClose: () => void;
  onSave: (body: { note: string; attendance?: Attendance }) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [note, setNote] = useState(registration.note ?? "");
  const [attendance, setAttendance] = useState<Attendance>(registration.attendance ?? "registered");
  const [busy, setBusyLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setBusy = (b: boolean) => {
    setBusyLocal(b);
    onBusy(b);
  };
  const workshop = registration.workshop;
  const canMark = Boolean(workshop && attendanceOpen(workshop, today));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim().length > NOTE_MAX) {
      setError(`Use ${NOTE_MAX} characters or fewer.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(isAdmin && canMark ? { note: note.trim(), attendance } : { note: note.trim() });
      onBusy(false);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void save(e)} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {isAdmin && (
        <div className="field">
          <label className="field-label" htmlFor="edit-reg-member">
            Member
          </label>
          <input id="edit-reg-member" className="field-control" value={registration.user ? `${registration.user.name} (${registration.user.email})` : "Deleted user"} readOnly />
        </div>
      )}
      <div className="field">
        <label className="field-label" htmlFor="edit-reg-workshop">
          Workshop
        </label>
        <input id="edit-reg-workshop" className="field-control" value={workshop ? `${workshop.name} — ${whenLabel(workshop)}` : "Deleted workshop"} readOnly />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="edit-reg-note">
          Note
        </label>
        <textarea
          id="edit-reg-note"
          className="field-control"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder={isAdmin ? "Note for this registration" : "For example: I use a wheelchair, or I will arrive 15 minutes late."}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
          aria-describedby="edit-reg-note-count"
        />
        <p id="edit-reg-note-count" className="t-caption muted" style={{ textAlign: "right" }}>
          {note.length} / {NOTE_MAX}
        </p>
      </div>
      {isAdmin && (
        <div className="field">
          <span className="field-label" id="edit-reg-attendance">
            Attendance
          </span>
          <div className="chips" role="radiogroup" aria-labelledby="edit-reg-attendance">
            {(Object.keys(ATTENDANCE_LABEL) as Attendance[]).map((a) => (
              <button key={a} type="button" role="radio" aria-checked={attendance === a} className="chip" disabled={!canMark} onClick={() => setAttendance(a)}>
                {ATTENDANCE_LABEL[a]}
              </button>
            ))}
          </div>
          {!canMark && <p className="t-caption muted">Attendance can be set from the workshop day on.</p>}
        </div>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
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
