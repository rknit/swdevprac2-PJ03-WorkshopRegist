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
  location: string;
  capacity: number;
  isActive: boolean;
};

export type Registration = {
  _id: string;
  workshop: Pick<Workshop, "_id" | "name" | "description" | "instructor" | "workshopDate" | "location" | "capacity" | "isActive"> | null;
  user: { _id: string; name: string; email: string; tel: string; role: string } | null;
  createdAt: string;
};

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
  createRegistration: (workshopId: string) =>
    request<{ success: true; data: Registration }>("/api/v1/registrations", { method: "POST", body: JSON.stringify({ workshop: workshopId }) }),
  updateRegistration: (id: string, workshopId: string) =>
    request<{ success: true; data: Registration }>(`/api/v1/registrations/${id}`, { method: "PUT", body: JSON.stringify({ workshop: workshopId }) }),
  deleteRegistration: (id: string) =>
    request<unknown>(`/api/v1/registrations/${id}`, { method: "DELETE" }),
};

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}