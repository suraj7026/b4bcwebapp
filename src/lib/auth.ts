import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { AppRole, AppUserMetadata } from "@/types/database";

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string;
  role: AppRole;
  zone: string | null;
}

const fallback = (email: string | null | undefined) =>
  (email ?? "B4BC").split("@")[0]?.replace(/[._-]+/g, " ") ?? "B4BC";

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = (user.app_metadata ?? {}) as Partial<AppUserMetadata>;
  const userMeta = (user.user_metadata ?? {}) as { full_name?: string };
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      meta.display_name ||
      userMeta.full_name ||
      fallback(user.email),
    role: (meta.role as AppRole) ?? "member",
    zone: meta.zone ?? null,
  };
}
