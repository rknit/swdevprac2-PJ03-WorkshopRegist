"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";

export function Nav() {
  const { user, loading, logout } = useAuth();
  const links = (
    <>
      <Link href="/">Workshops</Link>
      {user && <Link href="/account">Registrations</Link>}
      {user?.role === "admin" && <Link href="/manage">Admin</Link>}
    </>
  );
  return (
    <header className="nav">
      <strong>Workshop Registration</strong>
      <nav>{links}</nav>
      <span>
        {loading ? (
          <em>loading…</em>
        ) : user ? (
          <>
            {user.name} ({user.role}) <button onClick={() => void logout()}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </span>
    </header>
  );
}