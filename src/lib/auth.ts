import "server-only";
import { queryOne } from "@/lib/mysql";
import { readSession } from "@/lib/session";

export interface SessionUser {
  memberId: number;
  email: string | null;
  displayName: string;
  zone: string | null;
}

const fallback = (s: string | null | undefined) =>
  (s ?? "B4BC").split("@")[0]?.replace(/[._-]+/g, " ") ?? "B4BC";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await readSession();
  if (!session) return null;

  const row = await queryOne<{
    member_name: string | null;
    email_address: string | null;
    member_zone: string | null;
  }>(
    `SELECT member_name, email_address, member_zone
     FROM b4b_members m
     WHERE m.member_id = ?
       AND (m.date_of_exit IS NULL OR m.date_of_exit = '0000-00-00')
     LIMIT 1`,
    [session.memberId]
  );
  if (!row) return null;

  return {
    memberId: session.memberId,
    email: row.email_address,
    displayName: row.member_name?.trim() || fallback(row.email_address),
    zone: row.member_zone,
  };
}
