"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, type Registration, type Workshop } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { coverFor, dateLong, errorText, isFull, isPast, onCover, seatsLeft } from "../../../lib/format";
import { useToday } from "../../../lib/hooks";
import { Badge, Button, ButtonLink, CapacityBar, Icon, StatePanel, workshopStatus, type BadgeStatus } from "../../components/ui";

// The spec limits a member to 3 registrations on active (today or later) workshops.
const MAX_ACTIVE = 3;

export function WorkshopDetail({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mineState, setMine] = useState<Registration[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useToday();
  const isMember = user?.role === "member";
  // Only a member's own registrations matter here; ignore any older value after logout.
  const mine = isMember ? mineState : null;

  // registeredCount comes from the workshop itself, so it is right for every viewer.
  const loadWorkshop = useCallback(
    () =>
      api.getWorkshop(id).then(
        (res) => setWorkshop(res.data),
        () => setNotFound(true),
      ),
    [id],
  );

  // A member's own registrations decide the "Registered" and "Seat limit" states.
  const loadMine = useCallback(
    () =>
      api.listRegistrations().then(
        (res) => setMine(res.data),
        () => setMine([]),
      ),
    [],
  );

  useEffect(() => {
    void loadWorkshop();
  }, [loadWorkshop]);

  useEffect(() => {
    if (isMember) void loadMine();
  }, [isMember, loadMine]);

  const register = async () => {
    if (!workshop) return;
    setBusy(true);
    setError(null);
    try {
      await api.createRegistration(workshop._id);
      await Promise.all([loadWorkshop(), loadMine()]);
    } catch (err) {
      setError(errorText(err));
      // Seats may have changed while the page was open.
      await loadWorkshop();
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return (
      <div className="page">
        <BackLink />
        <StatePanel title="Workshop not found">
          <p className="muted">It may have been removed. Pick another workshop from the list.</p>
          <ButtonLink href="/" variant="dark">
            Browse workshops
          </ButtonLink>
        </StatePanel>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="page" style={{ paddingTop: 32 }}>
        <BackLink />
        <StatePanel title="Loading workshop…" dashed />
      </div>
    );
  }

  const cover = coverFor(workshop._id);
  const past = today ? isPast(workshop, today) : false;
  const registered = Boolean(mine?.some((r) => r.workshop?._id === workshop._id));
  const activeCount = mine ? mine.filter((r) => r.workshop && r.workshop.isActive && today && !isPast(r.workshop, today)).length : 0;
  const status = registered ? { status: "registered" as BadgeStatus, label: "Registered" } : workshopStatus(workshop, today);

  return (
    <div className="page" style={{ paddingTop: 32 }}>
      <BackLink />

      <section className="banner" style={{ background: cover.bg }} aria-labelledby="workshop-title">
        <Image className="banner-shape banner-ellipse-lg" src="/figma/banner-ellipse-lg.svg" alt="" aria-hidden width={300} height={300} unoptimized loading="eager" />
        <div className="banner-square" aria-hidden />
        <Image className="banner-shape banner-ellipse-sm" src="/figma/banner-ellipse-sm.svg" alt="" aria-hidden width={120} height={120} unoptimized loading="eager" />
        <div className="banner-text">
          <Badge status={status.status}>{status.label}</Badge>
          <h1 id="workshop-title" className="t-display-l banner-title" style={{ color: onCover(cover.bg) }}>
            {workshop.name}
          </h1>
        </div>
      </section>

      <div className="detail-columns">
        <div className="detail-main">
          <div className="facts">
            <Fact icon="user" tint="var(--sun)" label="Instructor" value={workshop.instructor} />
            <Fact icon="calendar" tint="var(--pink)" label="Date" value={dateLong(workshop.workshopDate)} />
            {workshop.startTime && <Fact icon="clock" tint="var(--mint)" label="Time" value={workshop.startTime} />}
            <Fact icon="pin" tint="var(--sky)" label="Location" value={workshop.location} />
          </div>
          <h2 className="t-heading-m">About this workshop</h2>
          <p className="t-body-l detail-about">{workshop.description}</p>
        </div>

        <aside className="register-panel" aria-label="Registration">
          <RegisterPanel
            workshop={workshop}
            role={authLoading ? "loading" : user?.role ?? "guest"}
            past={past}
            registered={registered}
            limitReached={activeCount >= MAX_ACTIVE}
            activeCount={activeCount}
            mineLoaded={mine !== null}
            busy={busy}
            onRegister={() => void register()}
          />
          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          <p className="t-caption muted">
            Workshop ID <span className="workshop-id">{workshop._id}</span>
          </p>
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" className="back-link">
      <Icon name="arrow" flip />
      <span>All workshops</span>
    </Link>
  );
}

function Fact({ icon, tint, label, value }: { icon: "user" | "calendar" | "clock" | "pin"; tint: string; label: string; value: string }) {
  return (
    <div className="fact">
      <span className="fact-icon" style={{ background: tint }}>
        <Icon name={icon} size={22} />
      </span>
      <div className="fact-text">
        <span className="t-label muted">{label}</span>
        <span className="t-strong">{value}</span>
      </div>
    </div>
  );
}

// Figma: the default "Seats left" panel and the "Register panel — other states" frame.
function RegisterPanel({
  workshop,
  role,
  past,
  registered,
  limitReached,
  activeCount,
  mineLoaded,
  busy,
  onRegister,
}: {
  workshop: Workshop;
  role: "loading" | "guest" | "member" | "admin";
  past: boolean;
  registered: boolean;
  limitReached: boolean;
  activeCount: number;
  mineLoaded: boolean;
  busy: boolean;
  onRegister: () => void;
}) {
  if (role === "member" && registered) {
    return (
      <StateBlock badge={<Badge status="registered">Registered</Badge>} title="You are in!">
        <ButtonLink href="/account" variant="secondary" block>
          Manage in My Registrations
        </ButtonLink>
      </StateBlock>
    );
  }
  if (past) {
    return (
      <StateBlock badge={<Badge status="past">Ended</Badge>} title="Registration closed">
        <Button variant="secondary" block disabled>
          Closed
        </Button>
      </StateBlock>
    );
  }
  if (isFull(workshop)) {
    return (
      <StateBlock badge={<Badge status="full">Full</Badge>} title="This workshop is full">
        <Button variant="secondary" block disabled>
          Workshop is full
        </Button>
      </StateBlock>
    );
  }
  if (role === "member" && limitReached) {
    return (
      <StateBlock badge={<Badge status="few">{`${activeCount} / ${MAX_ACTIVE} seats`}</Badge>} title="Seat limit reached">
        <ButtonLink href="/account" variant="dark" block>
          Go to My registrations
        </ButtonLink>
      </StateBlock>
    );
  }

  return (
    <>
      <p className="t-label muted">Seats left</p>
      <div className="seats-big">
        <span className="t-display-xl">{seatsLeft(workshop)}</span>
        <span className="t-heading-s muted">of {workshop.capacity}</span>
      </div>
      <CapacityBar workshop={workshop} />
      {role === "member" ? (
        <Button block onClick={onRegister} disabled={busy || !mineLoaded}>
          {busy ? "Registering…" : "Register for this workshop"}
        </Button>
      ) : role === "admin" ? (
        <ButtonLink href={`/manage?edit=${workshop._id}`} variant="secondary" block>
          Edit workshop
        </ButtonLink>
      ) : role === "guest" ? (
        <ButtonLink href={`/login?next=${encodeURIComponent(`/workshop/${workshop._id}`)}`} block>
          Log in to register
        </ButtonLink>
      ) : (
        <Button block disabled>
          Register for this workshop
        </Button>
      )}
    </>
  );
}

function StateBlock({ badge, title, children }: { badge: ReactNode; title: string; children: ReactNode }) {
  return (
    <>
      {badge}
      <p className="t-heading-s">{title}</p>
      {children}
    </>
  );
}
