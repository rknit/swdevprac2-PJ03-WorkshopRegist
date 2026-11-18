"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type UserRow } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { errorText } from "../../../lib/format";
import { AdminGate } from "../../components/AdminGate";
import { Avatar, Pagination, StatePanel, paginate } from "../../components/ui";

const MAX_ACTIVE = 3;
const PAGE_SIZE = 10;

export function UsersClient() {
  return (
    <AdminGate title="Manage Users" next="/manage/users">
      <ManageUsers />
    </AdminGate>
  );
}

// Figma: "08 · Admin — Users". The admin role is given or taken only here
// (PUT /users/:id/role). Sign-up always creates a member.
function ManageUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(
    () =>
      api
        .listUsers()
        .then(
          (res) => {
            setUsers(res.data);
            setError(null);
          },
          (e) => setError(errorText(e)),
        )
        .finally(() => setLoaded(true)),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const setRole = async (u: UserRow, role: "member" | "admin") => {
    if (role === u.role) return;
    setBusyId(u._id);
    setError(null);
    try {
      await api.setRole(u._id, role);
      setNotice(`${u.name} is now ${role === "admin" ? "an admin" : "a member"}.`);
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyId(null);
    }
  };

  const { total, current, items } = paginate(users, page, PAGE_SIZE);

  return (
    <div className="page">
      <h1 className="t-display-l">Manage Users</h1>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {notice ?? ""}
      </p>

      {!loaded ? (
        <StatePanel title="Loading users…" dashed />
      ) : (
        <div className="dtable-wrap">
          <div className="dtable-scroll">
            <table className="dtable" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Member</th>
                  <th style={{ width: "23%" }}>Phone</th>
                  <th style={{ width: "23%" }}>Active seats</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="dtable-empty">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  items.map((u) => {
                    const self = u._id === me?.id;
                    return (
                      <tr key={u._id}>
                        <td>
                          <div className="member-cell">
                            <Avatar name={u.name} id={u._id} />
                            <div>
                              <span className="t-strong">{u.name}</span>
                              <span className="t-caption muted">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="cell-nowrap">{u.tel}</td>
                        <td className="cell-nowrap">
                          {u.activeSeats ?? 0} / {MAX_ACTIVE}
                        </td>
                        <td>
                          <label className={u.role === "admin" ? "role-pill is-admin" : "role-pill"} title={self ? "You cannot change your own role." : undefined}>
                            <span aria-hidden>
                              {busyId === u._id ? "Saving…" : u.role === "admin" ? "Admin" : "Member"}
                              <span className="caret">▾</span>
                            </span>
                            <select
                              aria-label={`Role for ${u.name}`}
                              value={u.role}
                              disabled={self || busyId === u._id}
                              onChange={(e) => void setRole(u, e.target.value as "member" | "admin")}
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          </label>
                          {self && <span className="t-caption muted" style={{ marginLeft: 12 }}>You</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination label="User table pages" page={current} total={total} onChange={setPage} />
    </div>
  );
}
