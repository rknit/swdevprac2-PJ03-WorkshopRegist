"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Logo } from "./ui";

// Figma: "03 · Log in" (coral poster) and "04 · Sign up" (violet poster).
// Shape positions are the Figma x/y values inside the 640px poster.
const POSTERS = {
  login: {
    bg: "var(--coral)",
    light: false,
    title: ["Welcome", "back."],
    big: { src: "/figma/login-ellipse-lg.svg", size: 260, left: 360, top: 120 },
    square: { size: 180, left: 436.7, top: 309.3, rotate: -12, bg: "var(--violet)" },
    small: { src: "/figma/login-ellipse-sm.svg", size: 110, left: 260, top: 300 },
  },
  signup: {
    bg: "var(--violet)",
    light: true,
    title: ["Grab a", "seat."],
    big: { src: "/figma/signup-ellipse-lg.svg", size: 240, left: 380, top: 100 },
    square: { size: 200, left: 281.1, top: 315.8, rotate: 10, bg: "var(--sun)" },
    small: { src: "/figma/signup-ellipse-sm.svg", size: 110, left: 500, top: 360 },
  },
} as const;

export function AuthShell({ variant, children }: { variant: keyof typeof POSTERS; children: ReactNode }) {
  const p = POSTERS[variant];
  const text = p.light ? "var(--white)" : "var(--ink)";
  return (
    <div className="auth">
      <div className="auth-poster" style={{ background: p.bg }} aria-hidden>
        <Image className="auth-shape" src={p.big.src} alt="" width={p.big.size} height={p.big.size} unoptimized style={{ left: p.big.left, top: p.big.top }} />
        <div
          className="auth-square"
          style={{
            width: p.square.size,
            height: p.square.size,
            left: p.square.left,
            top: p.square.top,
            background: p.square.bg,
            transform: `rotate(${p.square.rotate}deg)`,
          }}
        />
        <Image className="auth-shape" src={p.small.src} alt="" width={p.small.size} height={p.small.size} unoptimized style={{ left: p.small.left, top: p.small.top }} />
        <Logo light={p.light} />
        <p className="t-display-xl auth-poster-title" style={{ color: text }}>
          {p.title[0]}
          <br />
          {p.title[1]}
        </p>
      </div>
      <div className="auth-form-area">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}

// Field with the Figma Input states: default, focus (CSS), and error (help text below).
export function TextField({
  id,
  label,
  error,
  invalid = false,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string | null; invalid?: boolean }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field-control" aria-invalid={error || invalid ? true : undefined} aria-describedby={error ? `${id}-help` : undefined} {...input} />
      {error && (
        <p id={`${id}-help`} className="field-help" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
