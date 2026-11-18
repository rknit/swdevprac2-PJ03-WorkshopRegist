"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtDate, type Workshop } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

export function WorkshopDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [registrations, setRegistrations] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getWorkshop(id);
        setWorkshop(res.data);
        const regs = await api.listRegistrations();
        setRegistrations(regs.data.filter((r) => r.workshop?._id === id).length);
      } catch {
        setNotFound(true);
      }
    })();
  }, [id]);

  const refreshCount = async (workshopId: string) => {
    const regs = await api.listRegistrations();
    setRegistrations(regs.data.filter((r) => r.workshop?._id === workshopId).length);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshop) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.createRegistration(workshop._id);
      setResult({ ok: true, text: `Registered. Registration id: ${res.data._id}` });
      await refreshCount(workshop._id);
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p>
        <Link href="/">← Back to workshops</Link>
      </p>
      {!workshop && !notFound && <p>Loading…</p>}
      {notFound && <p className="error">Workshop not found or inactive.</p>}
      {workshop && (
        <>
          <h1>{workshop.name}</h1>
          <div className="card">
            <p><strong>Description:</strong> {workshop.description}</p>
            <p><strong>Instructor:</strong> {workshop.instructor}</p>
            <p><strong>Date:</strong> {fmtDate(workshop.workshopDate)}</p>
            <p><strong>Location:</strong> {workshop.location}</p>
            <p><strong>Capacity:</strong> {workshop.capacity}</p>
            <p><strong>Workshop id:</strong> <code>{workshop._id}</code></p>
            {registrations !== null && (
              <p><strong>Registered so far:</strong> {registrations} / {workshop.capacity}</p>
            )}
          </div>
          {user?.role === "member" ? (
            <form onSubmit={(e) => void submit(e)} className="card">
              <h2>Register for this workshop</h2>
              <p>
                Workshop id: <code>{workshop._id}</code>
              </p>
              {result && <p className={result.ok ? "ok" : "error"}>{result.text}</p>}
              <button disabled={busy}>{busy ? "Submitting…" : "Register"}</button>
            </form>
          ) : user ? (
            <p>Admins do not register for workshops. Members only.</p>
          ) : (
            <p>
              <Link href="/login">Log in</Link> or <Link href="/register">register</Link> to enroll.
            </p>
          )}
        </>
      )}
    </div>
  );
}