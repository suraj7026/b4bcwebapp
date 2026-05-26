import "server-only";
import { env } from "../env";
import type {
  ApiErrorBody,
  ApiUser,
  BusinessMember,
  Industry,
  LoginResponse,
  MemberListParams,
  MemberListResponse,
  MemberPatchPayload,
  MemberReportPayload,
  TokenPair,
  Zone,
} from "./types";
import { buildSearchParams } from "../utils";
import {
  createSession,
  destroySession,
  readSession,
  type Session,
} from "../session";

const BASE = env.API_BASE_URL.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message || body.detail || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

interface ApiCallOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  searchParams?: Record<string, unknown>;
  accessToken?: string;
  formData?: FormData;
  signal?: AbortSignal;
}

async function call<T>(opts: ApiCallOptions): Promise<T> {
  const method = opts.method ?? "GET";
  const search = opts.searchParams
    ? `?${buildSearchParams(opts.searchParams).toString()}`
    : "";
  const url = `${BASE}/v1${opts.path}${search}`;

  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (opts.accessToken) {
    headers.authorization = `Bearer ${opts.accessToken}`;
  }

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    cache: "no-store",
    signal: opts.signal,
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

async function refreshAccess(session: Session): Promise<Session> {
  const tokens = await call<TokenPair>({
    method: "POST",
    path: "/auth/refresh",
    body: { refreshToken: session.refreshToken },
  });
  const next: Session = {
    ...session,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  await createSession(next);
  return next;
}

async function withAuth<T>(
  fn: (token: string) => Promise<T>
): Promise<T> {
  let session = await readSession();
  if (!session) {
    throw new ApiError(401, { code: "UNAUTHENTICATED", message: "Sign in to continue." });
  }
  if (session.accessTokenExpiresAt - Date.now() < 30_000) {
    session = await refreshAccess(session);
  }
  try {
    return await fn(session.accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      session = await refreshAccess(session);
      return await fn(session.accessToken);
    }
    throw err;
  }
}

export const api = {
  async login(username: string, password: string): Promise<ApiUser> {
    const data = await call<LoginResponse>({
      method: "POST",
      path: "/auth/login",
      body: { username, password },
    });
    await createSession({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpiresAt: Date.now() + data.expiresIn * 1000,
    });
    return data.user;
  },

  async logout(): Promise<void> {
    const session = await readSession();
    if (session) {
      try {
        await call({
          method: "POST",
          path: "/auth/logout",
          body: { refreshToken: session.refreshToken },
          accessToken: session.accessToken,
        });
      } catch {
        // best-effort
      }
    }
    await destroySession();
  },

  me(): Promise<ApiUser> {
    return withAuth((t) =>
      call<ApiUser>({ method: "GET", path: "/auth/me", accessToken: t })
    );
  },

  industries(): Promise<{ items: Industry[] }> {
    return withAuth((t) =>
      call({ method: "GET", path: "/industries", accessToken: t })
    );
  },

  zones(): Promise<{ items: Zone[] }> {
    return withAuth((t) =>
      call({ method: "GET", path: "/zones", accessToken: t })
    );
  },

  members(params: MemberListParams = {}): Promise<MemberListResponse> {
    return withAuth((t) =>
      call<MemberListResponse>({
        method: "GET",
        path: "/members",
        searchParams: params as Record<string, unknown>,
        accessToken: t,
      })
    );
  },

  member(id: string): Promise<BusinessMember> {
    return withAuth((t) =>
      call<BusinessMember>({
        method: "GET",
        path: `/members/${id}`,
        accessToken: t,
      })
    );
  },

  patchSelf(payload: MemberPatchPayload): Promise<BusinessMember> {
    return withAuth((t) =>
      call<BusinessMember>({
        method: "PATCH",
        path: "/members/me",
        body: payload,
        accessToken: t,
      })
    );
  },

  favorites(): Promise<{ items: BusinessMember[] }> {
    return withAuth((t) =>
      call({ method: "GET", path: "/favorites", accessToken: t })
    );
  },

  addFavorite(memberId: string): Promise<void> {
    return withAuth((t) =>
      call({ method: "PUT", path: `/favorites/${memberId}`, accessToken: t })
    );
  },

  removeFavorite(memberId: string): Promise<void> {
    return withAuth((t) =>
      call({
        method: "DELETE",
        path: `/favorites/${memberId}`,
        accessToken: t,
      })
    );
  },

  reportMember(
    memberId: string,
    payload: MemberReportPayload
  ): Promise<void> {
    return withAuth((t) =>
      call({
        method: "POST",
        path: `/members/${memberId}/report`,
        body: payload,
        accessToken: t,
      })
    );
  },

  deleteOwnAccount(): Promise<{ status: string; deletionAfter: string }> {
    return withAuth((t) =>
      call({ method: "DELETE", path: "/users/me", accessToken: t })
    );
  },

  exportOwnData(): Promise<{ downloadUrl: string; expiresAt: string }> {
    return withAuth((t) =>
      call({ method: "GET", path: "/users/me/export", accessToken: t })
    );
  },
};
