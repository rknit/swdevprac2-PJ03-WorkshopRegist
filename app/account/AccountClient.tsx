"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Registration } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { coverFor, dateDialog, dayTwoDigit, errorText, isPast, monthShort, onCover } from "../../lib/format";
import { useToday } from "../../lib/hooks";
import { ConfirmDialog, EditRegistrationDialog } from "../components/Dialogs";
import { Button, ButtonLink, Icon, StatePanel } from "../components/ui";

const MAX_ACTIVE = 3;
type Tab = "upcoming" | "past";
type RegWithWorkshop = Registration & { workshop: NonNullable<Registration["workshop"]> };

export function AccountClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const today = useToday();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [editing, setEditing] = useState<RegWithWorkshop | null>(null);
  const [cancelling, setCancelling] = useState<RegWithWorkshop | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Admins manage every registration on their own page.
  useEffect(() => {
    if (!loading && user?.role === "admin") router.replace("/manage/registrations");
  }, [loading, user, router]);

  const load = useCallback(
    () =>
      api
        .listRegistrations()
        .then(
          (regs) => {
            setRegistrations(regs.data);
            setError(null);
          },
          (e) => setError(errorText(e)),
        )
        .finally(() => setLoaded(true)),
    [],
  );

  const isMember = user?.role === "member";
  useEffect(() => {
    if (isMember) void load();
  }, [isMember, load]);

  const { upcoming, past, removed } = useMemo(() => {
    const withWorkshop = registrations.filter((r): r is RegWithWorkshop => r.workshop !== null);
    const live = withWorkshop.filter((r) => r.workshop.isActive);
    const byDate = (a: RegWithWorkshop, b: RegWithWorkshop) => Date.parse(a.workshop.workshopDate) - Date.parse(b.workshop.workshopDate);
    return {
      upcoming: today ? live.filter((r) => !isPast(r.workshop, today)).sort(byDate) : [],
      past: today ? live.filter((r) => isPast(r.workshop, today)).sort((a, b) => byDate(b, a)) : [],
      // Soft-deleted workshops: shown in Past so the member can still clear them.
      removed: withWorkshop.filter((r) => !r.workshop.isActive).concat(registrations.filter((r) => r.workshop === null) as RegWithWorkshop[]),
    };
  }, [registrations, today]);

  if (loading || (user?.role === "member" && !loaded)) {
    return (
      <div className="page">
        <h1 className="t-display-l">My registrations</h1>
        <StatePanel title="Loading your registrations…" dashed />
      </div>
    );
  }

  if (!user || user.role !== "member") {
    if (user?.role === "admin") return null;
    return (
      <div className="page">
        <h1 className="t-display-l">My registrations</h1>
        <StatePanel title="Log in to see your registrations">
          <ButtonLink href="/login">Log in</ButtonLink>
        </StatePanel>
      </div>
    );
  }

  const active = upcoming.length;
  const free = Math.max(0, MAX_ACTIVE - active);
  const pastCount = past.length + removed.length;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="t-display-l">My registrations</h1>
        <div className="seat-meter" aria-label={`Active seats: ${active} of ${MAX_ACTIVE}`}>
          <span className="t-label">Active seats</span>
          <div className="seat-slots">
            {Array.from({ length: MAX_ACTIVE }, (_, i) =>
              i < active ? (
                <span key={i} className="seat-slot" aria-hidden>
                  {i + 1}
                </span>
              ) : (
                <span key={i} className="seat-slot is-free" aria-hidden>
                  free
                </span>
              ),
            )}
            <span className="t-heading-m" aria-hidden>
              {active} / {MAX_ACTIVE}
            </span>
          </div>
        </div>
      </div>

      <div className="chips" role="tablist" aria-label="Registrations">
        <button type="button" role="tab" id="tab-upcoming" aria-controls="panel-upcoming" className="chip" aria-selected={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          Upcoming ({upcoming.length})
        </button>
        <button type="button" role="tab" id="tab-past" aria-controls="panel-past" className="chip" aria-selected={tab === "past"} onClick={() => setTab("past")}>
          Past ({pastCount})
        </button>
      </div>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {notice ?? ""}
      </p>

      {tab === "upcoming" ? (
        <div id="panel-upcoming" role="tabpanel" aria-labelledby="tab-upcoming" className="reg-list">
          {upcoming.map((r) => (
            <RegRow key={r._id} reg={r}>
              <Button variant="mint" onClick={() => setEditing(r)} aria-label={`Edit registration for ${r.workshop.name}`}>
                Edit
              </Button>
              <Button variant="secondary" onClick={() => setCancelling(r)} aria-label={`Cancel seat in ${r.workshop.name}`}>
                Cancel
              </Button>
            </RegRow>
          ))}
          {free > 0 && (
            <div className="panel-dashed free-slot">
              <span className="free-slot-plus t-heading-m" aria-hidden>
                +
              </span>
              <div style={{ flex: "1 1 0", minWidth: 200, display: "flex", flexDirection: "column", gap: 4 }}>
                <p className="t-heading-s">
                  You have {free} free slot{free === 1 ? "" : "s"}
                </p>
                <p className="muted">{active === 0 ? "Browse workshops and grab a seat." : `Browse workshops and grab ${free === 1 ? "one more seat" : "more seats"}.`}</p>
              </div>
              <ButtonLink href="/" variant="dark">
                Browse workshops
              </ButtonLink>
            </div>
          )}
        </div>
      ) : (
        <div id="panel-past" role="tabpanel" aria-labelledby="tab-past" className="reg-list" style={{ gap: 20 }}>
          {pastCount === 0 && <StatePanel title="No past workshops yet" dashed />}
          {past.map((r) => (
            <RegRow key={r._id} reg={r} past />
          ))}
          {removed.map((r) => (
            <RegRow key={r._id} reg={r} past removed>
              <Button variant="secondary" onClick={() => setCancelling(r)}>
                Remove
              </Button>
            </RegRow>
          ))}
        </div>
      )}

      <EditRegistrationDialog
        registration={editing}
        isAdmin={false}
        today={today}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          await api.updateRegistration(editing._id, { note: body.note });
          setEditing(null);
          setNotice("Your registration was saved.");
          await load();
        }}
      />

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel this seat?"
        body={
          cancelling?.workshop ? (
            <>
              You will lose your seat in <strong>{cancelling.workshop.name}</strong> ({dateDialog(cancelling.workshop.workshopDate)}).
            </>
          ) : (
            "This registration will be removed."
          )
        }
        safeLabel="Keep my seat"
        dangerLabel="Yes, cancel"
        onClose={() => setCancelling(null)}
        onConfirm={async () => {
          if (!cancelling) return;
          await api.deleteRegistration(cancelling._id);
          setCancelling(null);
          setNotice("Your seat was cancelled.");
          await load();
        }}
      />
    </div>
  );
}

// Figma: one registration row — date block, title and meta, actions.
function RegRow({ reg, past = false, removed = false, children }: { reg: RegWithWorkshop; past?: boolean; removed?: boolean; children?: React.ReactNode }) {
  const w = reg.workshop;
  if (!w) {
    return (
      <div className="reg-row is-past">
        <div className="reg-main">
          <p className="t-heading-s">Workshop removed</p>
        </div>
        {children && <div className="reg-actions">{children}</div>}
      </div>
    );
  }
  const cover = coverFor(w._id);
  const bg = past ? "var(--mist)" : cover.bg;
  return (
    <div className={past ? "reg-row is-past" : "reg-row"}>
      <div className="reg-date" style={{ background: bg, color: onCover(bg) }} aria-hidden>
        <span className="t-label">{monthShort(w.workshopDate)}</span>
        <span className="t-display-l">{dayTwoDigit(w.workshopDate)}</span>
      </div>
      <div className="reg-main">
        {removed ? (
          <p className="t-heading-s">{w.name} (removed by an admin)</p>
        ) : (
          <Link href={`/workshop/${w._id}`} className="t-heading-s">
            {w.name}
          </Link>
        )}
        <span className="sr-only">{dateDialog(w.workshopDate)}</span>
        <div className="reg-meta">
          <span className="meta">
            <Icon name="user" size={18} />
            <span>{w.instructor}</span>
          </span>
          {w.startTime && (
            <span className="meta">
              <Icon name="clock" size={18} />
              <span>{w.startTime}</span>
            </span>
          )}
          <span className="meta">
            <Icon name="pin" size={18} />
            <span>{w.location}</span>
          </span>
        </div>
        {reg.note && <p className="reg-note">Note: {reg.note}</p>}
      </div>
      {children && <div className="reg-actions">{children}</div>}
    </div>
  );
}
