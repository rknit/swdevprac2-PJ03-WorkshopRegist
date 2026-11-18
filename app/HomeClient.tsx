"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtDate, type Workshop } from "../lib/api";
import { useAuth } from "../lib/auth";

export function HomeClient() {
  const [search, setSearch] = useState("");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.listWorkshops(search || undefined);
        setWorkshops(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoaded(true);
      }
    })();
  }, [search]);

  return (
    <div>
      <h1>Workshops</h1>
      <p>
        All users can view workshops. {user ? `Logged in as ${user.name} (${user.role}).` : "Register or log in to take actions."}
      </p>
      <label className="field">
        Search
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name, description, instructor, location" />
      </label>
      {error && <p className="error">{error}</p>}
      {!loaded && <p>Loading…</p>}
      {loaded && !error && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Instructor</th>
              <th>Date</th>
              <th>Location</th>
              <th>Capacity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {workshops.map((w) => (
              <tr key={w._id}>
                <td>{w.name}</td>
                <td>{w.instructor}</td>
                <td>
                  {fmtDate(w.workshopDate)} {today && w.workshopDate.slice(0, 10) < today ? <em>(past)</em> : null}
                </td>
                <td>{w.location}</td>
                <td>{w.capacity}</td>
                <td>
                  <Link href={`/workshop/${w._id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {loaded && !error && workshops.length === 0 && <p>No active workshops found.</p>}
    </div>
  );
}