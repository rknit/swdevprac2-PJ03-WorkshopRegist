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

// One query-string value on the client, "" during server render.
export function useQueryParam(name: string): string {
  return useSyncExternalStore(
    noSubscribe,
    () => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get(name) ?? ""),
    () => "",
  );
}
