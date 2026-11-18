"use client";

import { useSyncExternalStore } from "react";
import { bkkToday } from "./format";

const noSubscribe = () => () => {};

// Today's Bangkok "YYYY-MM-DD" on the client, "" during server render.
// Date rules wait for a non-empty value, so the server HTML and the first
// client render match.
export function useToday(): string {
  return useSyncExternalStore(noSubscribe, bkkToday, () => "");
}

// Only same-site paths are allowed as a post-login target.
export function safeNext(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

function nextQuery(): string {
  const next = safeNext();
  return next ? `?next=${encodeURIComponent(next)}` : "";
}

// The "?next=..." part to carry between log in and sign up, or "".
export function useNextQuery(): string {
  return useSyncExternalStore(noSubscribe, nextQuery, () => "");
}
