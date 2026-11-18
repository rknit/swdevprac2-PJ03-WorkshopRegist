"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

export function RegisterClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Note: no role field is offered. New users are always `member`.
      const user = await register({ name, email, tel, password });
      router.push(user.role === "admin" ? "/manage" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <h1>Register</h1>
      <p>New accounts are created with the <code>member</code> role.</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={(e) => void submit(e)}>
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          Telephone
          <input value={tel} onChange={(e) => setTel(e.target.value)} required />
        </label>
        <label className="field">
          Password (min 6 characters)
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </label>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}