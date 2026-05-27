"use server";

import { redirect } from "next/navigation";
import { query } from "@/lib/mysql";
import {
  clearSessionCookie,
  setSessionCookie,
  signSession,
} from "@/lib/session";

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export async function loginAction(
  input: string,
  next?: string
): Promise<LoginResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter your email or phone." };

  const rows = await query<{ member_id: number }>(
    `SELECT member_id
     FROM b4b_members m
     WHERE (m.email_address = ? OR m.phone_number = ?)
       AND (m.date_of_exit IS NULL OR m.date_of_exit = '0000-00-00')
     LIMIT 1`,
    [trimmed, trimmed]
  );
  const member = rows[0];
  if (!member) return { ok: false, error: "No member found with that email or phone." };

  const token = await signSession({ memberId: member.member_id });
  await setSessionCookie(token);

  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/directory";
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
