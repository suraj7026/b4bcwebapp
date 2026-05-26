import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import type { ApiUser } from "./api/types";

export interface Session {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
}

const COOKIE = env.SESSION_COOKIE_NAME;
const SECRET = new TextEncoder().encode(env.SESSION_SECRET);

export async function createSession(session: Session): Promise<void> {
  const jwt = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
  const jar = await cookies();
  jar.set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function requireSession(): Promise<Session> {
  const session = await readSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
