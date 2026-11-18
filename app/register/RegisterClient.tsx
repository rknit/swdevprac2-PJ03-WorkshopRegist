"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { errorText } from "../../lib/format";
import { AuthShell, TextField } from "../components/AuthShell";

type Field = "name" | "email" | "tel" | "password";
type Errors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the backend User model, checked first so each field shows its own error.
function validate(v: Record<Field, string>): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = "Enter your full name.";
  if (!v.email.trim()) errors.email = "Enter your email.";
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email, like you@example.com.";
  if (!v.tel.trim()) errors.tel = "Enter your phone number.";
  if (v.password.length < 6) errors.password = "Use at least 6 characters.";
  return errors;
}

// Put a server error under the field it is about. Mongoose joins several as
// "User validation failed: email: ..., password: ...".
function serverErrors(message: string): { fields: Errors; general: string | null } {
  if (/email is already in use/i.test(message)) return { fields: { email: message }, general: null };
  const fields: Errors = {};
  const re = /(name|email|tel|password): (.+?)(?=, (?:name|email|tel|password): |$)/g;
  for (const m of message.matchAll(re)) {
    const key = m[1] as Field;
    fields[key] = key === "password" ? "Use at least 6 characters." : m[2].replace(/^Please add an? /, "Enter a ").replace(/\.?$/, ".");
  }
  return Object.keys(fields).length ? { fields, general: null } : { fields: {}, general: message };
}

export function RegisterClient() {
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", tel: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !busy) router.replace(user.role === "admin" ? "/manage" : "/");
  }, [loading, user, busy, router]);

  const set = (key: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    // Clear a field's error as soon as the user edits it.
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneral(null);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = (["name", "email", "tel", "password"] as Field[]).find((k) => found[k]);
      if (first) document.getElementById(`signup-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      // No role field: the backend always creates a `member`.
      // Flow 1: "Valid info?" yes -> 04 Log in. The account is created, but the user logs in themselves.
      await api.register({ name: values.name.trim(), email: values.email.trim(), tel: values.tel.trim(), password: values.password });
      const email = values.email.trim();
      // Next.js keeps this page mounted (hidden) after we leave it, so reset the
      // form now; otherwise a return visit shows it stuck on "Creating account…".
      setValues({ name: "", email: "", tel: "", password: "" });
      setErrors({});
      setBusy(false);
      router.push(`/login?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const parsed = serverErrors(errorText(err));
      setErrors(parsed.fields);
      setGeneral(parsed.general);
      setBusy(false);
    }
  };

  return (
    <AuthShell variant="signup">
      <form className="auth-form" onSubmit={(e) => void submit(e)} noValidate>
        <h1 className="t-heading-m">Create your account</h1>
        <TextField id="signup-name" label="Full name" autoComplete="name" placeholder="Mali Srisawat" value={values.name} onChange={set("name")} required error={errors.name} />
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={set("email")}
          required
          error={errors.email}
        />
        <TextField id="signup-tel" label="Phone" type="tel" autoComplete="tel" placeholder="081-234-5678" value={values.tel} onChange={set("tel")} required error={errors.tel} />
        <TextField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={values.password}
          onChange={set("password")}
          minLength={6}
          required
          error={errors.password}
        />
        {general && (
          <p className="notice notice-error" role="alert">
            {general}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="auth-switch">
          <span className="muted">Have an account?</span>
          <Link href="/login" className="link-violet">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
