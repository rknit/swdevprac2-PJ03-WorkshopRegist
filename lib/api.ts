"use client";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

export type User = {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: "member" | "admin";
};

export type Workshop = {
  _id: string;
  name: string;
  description: string;
  instructor: string;
  workshopDate: string;
  // Optional "HH:mm" start time, Asia/Bangkok.
  startTime?: string | null;
  // Optional "HH:mm" end time, later than startTime.
  endTime?: string | null;
  // Optional banner image (http(s) URL) for the card cover and the detail banner.
  coverImage?: string | null;
  location: string;
  capacity: number;
  registeredCount?: number;
  isActive: boolean;
};

export type UserRow = {
  _id: string;
  name: string;
  email: string;
  tel: string;
  role: "member" | "admin";
  // Live count of registrations on active workshops (today or later).
  activeSeats?: number;
};

export type Registration = {
  _id: string;
  workshop: Pick<Workshop, "_id" | "name" | "description" | "instructor" | "workshopDate" | "startTime" | "endTime" | "coverImage" | "location" | "capacity" | "registeredCount" | "isActive"> | null;
  user: { _id: string; name: string; email: string; tel: string; role: string } | null;
  // Free-text note (member and admin).
  note?: string;
  // Admin-only: the API never sends it to members.
  attendance?: Attendance;
  createdAt: string;
};

export type Attendance = "registered" | "attended" | "no-show";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("token", token);
  else window.localStorage.removeItem("token");
}

async function request<T>(path: string, init: RequestInit = {}, expectJson = true): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!expectJson) return res.status as unknown as T;
  const text = await res.text();
  let json: { success?: boolean; error?: string; [k: string]: unknown };
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { success: res.ok, error: res.ok ? undefined : `Non-JSON response (${res.status})` };
  }
  if (!res.ok || json.success === false) {
    throw new ApiError(res.status, json.error ?? `Request failed (${res.status})`);
  }
  return json as T;
}

export const api = {
  register: (body: { name: string; email: string; tel: string; password: string }) =>
    request<{ success: true; data: { id: string; name: string; email: string; role: "member" | "admin"; token: string } }>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ success: true; data: { id: string; name: string; email: string; role: "member" | "admin"; token: string } }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ success: true; data: User }>("/api/v1/auth/me"),
  logout: () => request<unknown>("/api/v1/auth/logout", { method: "GET" }),
  listWorkshops: (search?: string) =>
    request<{ success: true; count: number; data: Workshop[] }>(`/api/v1/workshops${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getWorkshop: (id: string) =>
    request<{ success: true; data: Workshop }>(`/api/v1/workshops/${id}`),
  createWorkshop: (body: Record<string, unknown>) =>
    request<{ success: true; data: Workshop }>("/api/v1/workshops", { method: "POST", body: JSON.stringify(body) }),
  updateWorkshop: (id: string, body: Record<string, unknown>) =>
    request<{ success: true; data: Workshop }>(`/api/v1/workshops/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteWorkshop: (id: string) =>
    request<unknown>(`/api/v1/workshops/${id}`, { method: "DELETE" }),
  listRegistrations: () =>
    request<{ success: true; count: number; data: Registration[] }>("/api/v1/registrations"),
  // userId and ignoreCapacity are admin-only.
  createRegistration: (workshopId: string, userId?: string, ignoreCapacity = false) =>
    request<{ success: true; data: Registration }>("/api/v1/registrations", {
      method: "POST",
      body: JSON.stringify(userId ? { workshop: workshopId, user: userId, ...(ignoreCapacity ? { ignoreCapacity: true } : {}) } : { workshop: workshopId }),
    }),
  listUsers: () =>
    request<{ success: true; count: number; data: UserRow[] }>("/api/v1/users"),
  setRole: (userId: string, role: "member" | "admin") =>
    request<{ success: true; data: User }>(`/api/v1/users/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  // Edit the note (owner or admin) and attendance (admin only).
  updateRegistration: (id: string, body: { note?: string; attendance?: Attendance }) =>
    request<{ success: true; data: Registration }>(`/api/v1/registrations/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteRegistration: (id: string) =>
    request<unknown>(`/api/v1/registrations/${id}`, { method: "DELETE" }),
};

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}