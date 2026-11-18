"use client";

import type { ReactNode } from "react";
import { useAuth } from "../../lib/auth";
import { ButtonLink, StatePanel } from "./ui";

// Shows the page only to admins. The backend also checks the role on every
// admin route; this only keeps members and guests from an empty screen.
export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="page">
        <h1 className="t-display-l">{title}</h1>
        <StatePanel title="Loading…" dashed />
      </div>
    );
  }
  if (user?.role !== "admin") {
    return (
      <div className="page">
        <h1 className="t-display-l">{title}</h1>
        <StatePanel title="Admins only">
          <p className="muted">{user ? "Your account is a member account. Ask an admin to change your role." : "Log in with an admin account to open this page."}</p>
          {user ? (
            <ButtonLink href="/" variant="dark">
              Browse workshops
            </ButtonLink>
          ) : (
            <ButtonLink href="/login">Log in</ButtonLink>
          )}
        </StatePanel>
      </div>
    );
  }
  return <>{children}</>;
}
