"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import type { Workshop } from "../../lib/api";
import { avatarColour, fillRatio, initials, isFull, isNearlyFull, isPast } from "../../lib/format";

/* ---------- Icon (Figma: Icon/*) ---------- */

export type IconName = "arrow" | "calendar" | "clock" | "pin" | "search" | "user";

export function Icon({ name, size = 24, flip = false }: { name: IconName; size?: number; flip?: boolean }) {
  return (
    <Image
      src={`/figma/icon-${name}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      unoptimized
      className={flip ? "icon icon-flip" : "icon"}
    />
  );
}

/* ---------- Cover image (workshop banner) ---------- */

// Fills its positioned parent. A URL that fails to load shows nothing, so the
// parent's plain cover colour shows through. Admin-entered URLs can point to
// any host, so the image is not passed through the Next.js optimizer.
export function CoverImage({ src, className, onError }: { src: string | null | undefined; className: string; onError?: () => void }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      fill
      unoptimized
      className={className}
      onError={() => {
        setFailedSrc(src);
        onError?.();
      }}
    />
  );
}

/* ---------- Button (Figma: Button — Primary / Secondary / Dark, plus Sun and Mint fills) ---------- */

export type ButtonVariant = "primary" | "secondary" | "dark" | "sun" | "mint";

export function Button({
  variant = "primary",
  block = false,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; block?: boolean }) {
  return <button type="button" className={`btn btn-${variant}${block ? " btn-block" : ""}${className ? ` ${className}` : ""}`} {...rest} />;
}

export function ButtonLink({ href, variant = "primary", block = false, children }: { href: string; variant?: ButtonVariant; block?: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`btn btn-${variant}${block ? " btn-block" : ""}`}>
      {children}
    </Link>
  );
}

/* ---------- Badge (Figma: Badge — Open / Few seats / Full / Past / Registered) ---------- */

export type BadgeStatus = "open" | "few" | "full" | "past" | "registered";

export function Badge({ status, children }: { status: BadgeStatus; children: ReactNode }) {
  return <span className={`badge badge-${status}`}>{children}</span>;
}

// Status of a workshop for badges: ended, full, few seats (10% or less left), or open.
export function workshopStatus(w: Workshop, today: string): { status: BadgeStatus; label: string } {
  if (today && isPast(w, today)) return { status: "past", label: "Ended" };
  if (isFull(w)) return { status: "full", label: "Full" };
  if (isNearlyFull(w)) return { status: "few", label: "Few seats" };
  return { status: "open", label: "Open" };
}

/* ---------- Capacity bar ---------- */

export function CapacityBar({ workshop, small = false }: { workshop: Workshop; small?: boolean }) {
  const pct = Math.round(fillRatio(workshop) * 100);
  return (
    <div
      className={small ? "capacity capacity-sm" : "capacity"}
      role="meter"
      aria-label="Seats taken"
      aria-valuemin={0}
      aria-valuemax={workshop.capacity}
      aria-valuenow={workshop.registeredCount ?? 0}
    >
      <div className={`capacity-fill${isNearlyFull(workshop) ? " is-hot" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ name, id, colour }: { name: string; id: string; colour?: string }) {
  return (
    <span className="avatar" style={{ background: colour ?? avatarColour(id) }} aria-hidden>
      {initials(name)}
    </span>
  );
}

/* ---------- Logo ---------- */

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label="WorkJam home">
      <span className="logo-mark t-heading-s">W</span>
      <span className="t-heading-s" style={{ color: light ? "var(--white)" : "var(--ink)" }}>
        WorkJam
      </span>
    </Link>
  );
}

/* ---------- Pagination (Figma: Pagination 7:44) ---------- */

// Page list with first, last, a window around the current page, and ellipses for gaps.
function pageList(page: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3].forEach((p) => pages.add(p));
  if (page >= total - 2) [total - 1, total - 2].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, total, onChange, label }: { page: number; total: number; onChange: (page: number) => void; label: string }) {
  return (
    <nav className="pagination" aria-label={label}>
      <ol>
        <li>
          <button type="button" className="page-item" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <Icon name="arrow" flip />
          </button>
        </li>
        {pageList(page, total).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`}>
              <span className="page-item page-ellipsis" aria-hidden>
                …
              </span>
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className="page-item"
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" className="page-item" onClick={() => onChange(page + 1)} disabled={page >= total} aria-label="Next page">
            <Icon name="arrow" />
          </button>
        </li>
      </ol>
    </nav>
  );
}

// Clamp a page number to the range that exists after filtering.
export function paginate<T>(items: T[], page: number, size: number) {
  const total = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), total);
  return { total, current, items: items.slice((current - 1) * size, current * size) };
}

/* ---------- Dialog and Drawer (native <dialog>: focus trap, Esc to close) ---------- */

// True when a click on a <dialog> lands outside its box, i.e. on the backdrop.
// A click on the dialog padding also targets the <dialog>, so check the position.
function isBackdropClick(e: ReactMouseEvent<HTMLDialogElement>) {
  if (e.target !== e.currentTarget) return false;
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", handleCancel);
    return () => el.removeEventListener("cancel", handleCancel);
  }, [onClose]);
  return ref;
}

export function Dialog({
  open,
  onClose,
  title,
  bar = "coral",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  bar?: "coral" | "violet";
  children: ReactNode;
}) {
  const ref = useModal(open, onClose);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (isBackdropClick(e)) onClose();
      }}
    >
      {open && (
        <>
          <div className={bar === "violet" ? "dialog-bar is-violet" : "dialog-bar"} aria-hidden />
          <h2 id="dialog-title" className="t-heading-m">
            {title}
          </h2>
          {children}
        </>
      )}
    </dialog>
  );
}

export function Drawer({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useModal(open, onClose);
  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        if (isBackdropClick(e)) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}

/* ---------- Page states ---------- */

export function StatePanel({ title, children, dashed = false }: { title: string; children?: ReactNode; dashed?: boolean }) {
  return (
    <div className={`${dashed ? "panel-dashed" : "panel"} state-panel`} role="status">
      <p className="t-heading-s">{title}</p>
      {children}
    </div>
  );
}
