import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export const middleware = (req: NextRequest) => updateSession(req);

export const config = {
  // Run on everything except Next internals, static files, and images.
  // updateSession itself decides which paths require auth.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
