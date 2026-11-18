"use client";

import { useEffect, useState } from "react";
import { api, fmtDate, type Workshop } from "../../lib/api";
import { useAuth } from "../../lib/auth";

type FormState = {
  name: string;
  description: string;
  instructor: string;
  workshopDate: string;
  location: string;
  capacity: string;
};

const empty: FormState = { name: "", description: "", instructor: "", workshopDate: "", location: "", capacity: "" };

export function ManageClient() {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isAdmin = user?.role === "admin";

  const load = async () => {
    try {
      const res = await api.listWorkshops();
      setWorkshops(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const startEdit = (w: Workshop) => {
    setEditId(w._id);
    setForm({
      name: w.name,
      description: w.description,
      instructor: w.instructor,
      workshopDate: w.workshopDate.slice(0, 10),
      location: w.location,
      capacity: String(w.capacity),
    });
    setFormError(null);
    setFormOk(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFormOk(null);
    const body = { ...form, capacity: Number(form.capacity) };
    try {
      if (editId) {
        const res = await api.updateWorkshop(editId, body);
        setFormOk(`Workshop ${res.data._id} updated.`);
      } else {
        const res = await api.createWorkshop(body);
        setFormOk(`Workshop created. id: ${res.data._id}`);
      }
      setForm(empty);
      setEditId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    setFormError(null);
    setFormOk(null);
    try {
      await api.deleteWorkshop(id);
      setFormOk(`Workshop ${id} deleted.`);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!loaded) return <p>Loading…</p>;
  if (!isAdmin) {
    return (
      <div>
        <h1>Admin</h1>
        <p className="error">Admin role required. Log in as an admin to manage workshops and registrations.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Admin: Workshops</h1>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Instructor</th>
            <th>Date</th>
            <th>Location</th>
            <th>Capacity</th>
            <th>id</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {workshops.map((w) => (
            <tr key={w._id}>
              <td>{w.name}</td>
              <td>{w.instructor}</td>
              <td>{fmtDate(w.workshopDate)}</td>
              <td>{w.location}</td>
              <td>{w.capacity}</td>
              <td><code>{w._id}</code></td>
              <td>
                <button onClick={() => startEdit(w)}>Edit</button>{" "}
                <button onClick={() => void del(w._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card">
        <h2>{editId ? `Update workshop ${editId}` : "Create workshop"}</h2>
        {formOk && <p className="ok">{formOk}</p>}
        {formError && <p className="error">{formError}</p>}
        <form onSubmit={(e) => void submit(e)}>
          <label className="field">
            Name
            <input value={form.name} onChange={set("name")} required />
          </label>
          <label className="field">
            Description
            <input value={form.description} onChange={set("description")} required />
          </label>
          <label className="field">
            Instructor
            <input value={form.instructor} onChange={set("instructor")} required />
          </label>
          <label className="field">
            Workshop date (YYYY-MM-DD, not in the past)
            <input type="date" value={form.workshopDate} onChange={set("workshopDate")} required />
          </label>
          <label className="field">
            Location
            <input value={form.location} onChange={set("location")} required />
          </label>
          <label className="field">
            Capacity
            <input type="number" min={1} value={form.capacity} onChange={set("capacity")} required />
          </label>
          <div className="row">
            <button type="submit" disabled={busy}>{busy ? "Saving…" : editId ? "Update" : "Create"}</button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm(empty); }}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}