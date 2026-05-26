"use client";

import type {
  ApiErrorBody,
  ApiUser,
  BusinessMember,
  Industry,
  MemberListParams,
  MemberListResponse,
  MemberPatchPayload,
  MemberReportPayload,
  Zone,
} from "./types";
import { buildSearchParams } from "../utils";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message || body.detail || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

const BFF = "/api/bff";

async function bff<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BFF}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      accept: "application/json",
      ...init.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  const payload = ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");
  if (!res.ok) {
    const body: ApiErrorBody =
      typeof payload === "object" && payload !== null
        ? (payload as ApiErrorBody)
        : { message: String(payload) };
    throw new ApiError(res.status, body);
  }
  return payload as T;
}

export const client = {
  async login(username: string, password: string): Promise<ApiUser> {
    return bff<ApiUser>("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  async logout(): Promise<void> {
    await bff<void>("/logout", { method: "POST" });
  },
  me: () => bff<ApiUser>("/me"),
  industries: () => bff<{ items: Industry[] }>("/industries"),
  zones: () => bff<{ items: Zone[] }>("/zones"),
  members: (params: MemberListParams = {}) => {
    const qs = buildSearchParams(params as Record<string, unknown>).toString();
    return bff<MemberListResponse>(`/members${qs ? `?${qs}` : ""}`);
  },
  member: (id: string) => bff<BusinessMember>(`/members/${id}`),
  patchSelf: (payload: MemberPatchPayload) =>
    bff<BusinessMember>("/members/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  favorites: () => bff<{ items: BusinessMember[] }>("/favorites"),
  addFavorite: (id: string) =>
    bff<void>(`/favorites/${id}`, { method: "PUT" }),
  removeFavorite: (id: string) =>
    bff<void>(`/favorites/${id}`, { method: "DELETE" }),
  reportMember: (id: string, payload: MemberReportPayload) =>
    bff<void>(`/members/${id}/report`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  exportOwnData: () =>
    bff<{ downloadUrl: string; expiresAt: string }>("/privacy/export"),
  deleteOwnAccount: () =>
    bff<{ status: string; deletionAfter: string }>("/privacy/delete", {
      method: "DELETE",
    }),
};
