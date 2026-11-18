"use client";

import { useState, type ReactNode } from "react";
import type { Workshop } from "../../lib/api";
import { errorText, isFull, isPast, seatsLeft, whenLabel } from "../../lib/format";
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

// Workshops a registration can move to: upcoming, not full, and not one the user already holds.
export function moveTargets(workshops: Workshop[], today: string, heldWorkshopIds: Set<string>): Workshop[] {
  return workshops
    .filter((w) => w.isActive && !isPast(w, today) && !isFull(w) && !heldWorkshopIds.has(w._id))
    .sort((a, b) => Date.parse(a.workshopDate) - Date.parse(b.workshopDate));
}

// Flow 3 (13.1.2) and Flow 5 (22.1): "Edit registration". The editable field is
// the workshop: the seat moves to another workshop (PUT /registrations/:id).
export function EditRegistrationDialog({
  open,
  currentName,
  member,
  targets,
  onClose,
  onSave,
}: {
  open: boolean;
  currentName: string;
  // Set for an admin editing another member's registration (Flow 5).
  member?: string;
  targets: Workshop[];
  onClose: () => void;
  onSave: (workshopId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={busy ? () => undefined : onClose} title="Edit registration" bar="violet">
      <EditRegistrationBody currentName={currentName} member={member} targets={targets} onClose={onClose} onSave={onSave} onBusy={setBusy} />
    </Dialog>
  );
}

function EditRegistrationBody({
  currentName,
  member,
  targets,
  onClose,
  onSave,
  onBusy,
}: {
  currentName: string;
  member?: string;
  targets: Workshop[];
  onClose: () => void;
  onSave: (workshopId: string) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [choice, setChoice] = useState("");
  const [busy, setBusyLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setBusy = (b: boolean) => {
    setBusyLocal(b);
    onBusy(b);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choice) {
      setError("Pick the new workshop.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(choice);
      onBusy(false);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void save(e)} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {member !== undefined && (
        <div className="field">
          <label className="field-label" htmlFor="edit-reg-member">
            Member
          </label>
          <input id="edit-reg-member" className="field-control" value={member} readOnly />
        </div>
      )}
      <div className="field">
        <label className="field-label" htmlFor="edit-reg-current">
          Current workshop
        </label>
        <input id="edit-reg-current" className="field-control" value={currentName} readOnly />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="move-target">
          New workshop
        </label>
        {targets.length === 0 ? (
          <p className="t-body">No other upcoming workshop has a free seat right now.</p>
        ) : (
          <select
            id="move-target"
            className="field-control"
            value={choice}
            onChange={(e) => {
              setChoice(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "move-target-help" : undefined}
          >
            <option value="">Pick a workshop</option>
            {targets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} — {whenLabel(w)} ({seatsLeft(w)} left)
              </option>
            ))}
          </select>
        )}
        {error && (
          <p id="move-target-help" className="field-help" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || targets.length === 0}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
