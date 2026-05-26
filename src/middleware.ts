import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/directory",
  "/favorites",
  "/profile",
  "/admin",
];
const COOKIE = process.env.SESSION_COOKIE_NAME ?? "b4bc_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const hasSession = req.cookies.has(COOKIE);

  if (pathname === "/login" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/directory";
    return NextResponse.redirect(url);
  }

  if (needsAuth && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/directory/:path*", "/favorites/:path*", "/profile/:path*", "/admin/:path*"],
};
