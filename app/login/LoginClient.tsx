"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { errorText } from "../../lib/format";
import { safeNext, useNextQuery } from "../../lib/hooks";
import { AuthShell, TextField } from "../components/AuthShell";

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const carry = useNextQuery();
  const { user, loading, login } = useAuth();
  const router = useRouter();

  // A signed-in user has nothing to do here.
  useEffect(() => {
    if (!loading && user && !busy) router.replace(user.role === "admin" ? "/manage" : "/");
  }, [loading, user, busy, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const signedIn = await login(email.trim(), password);
      router.push(safeNext() ?? (signedIn.role === "admin" ? "/manage" : "/"));
    } catch (err) {
      const msg = errorText(err);
      setError(/invalid credentials/i.test(msg) ? "The email or password is wrong. Check both and try again." : msg);
      setBusy(false);
    }
  };

  return (
    <AuthShell variant="login">
      <form className="auth-form" onSubmit={(e) => void submit(e)}>
        <h1 className="t-heading-m">Log in</h1>
        <TextField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          invalid={Boolean(error)}
        />
        <TextField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          error={error}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        <p className="auth-switch">
          <span className="muted">No account?</span>
          <Link href={`/register${carry}`} className="link-violet">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
