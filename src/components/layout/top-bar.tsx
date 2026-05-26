"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/utils/supabase/client";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: "space_dashboard" },
  { label: "Directory", href: "/directory", icon: "business_center" },
  { label: "Favorites", href: "/favorites", icon: "bookmark" },
  { label: "Profile", href: "/profile", icon: "account_circle" },
];

export function TopBar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-3">
          <Link href="/directory" className="flex items-center gap-2">
            <Icon name="business_center" className="text-primary" />
            <span className="text-xl font-bold tracking-tight text-primary">
              B4BC Connect
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active =
              pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden text-right text-xs leading-tight md:block">
            <p className="font-semibold text-on-surface">{user.displayName}</p>
            <p className="text-on-surface-variant">
              {user.role.replace("_", " ")}
              {user.zone ? ` • ${user.zone}` : ""}
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="Account menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-primary hover:bg-surface-container-low"
            >
              {user.displayName?.[0]?.toUpperCase() ?? "U"}
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-card"
                onClick={() => setMenuOpen(false)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                >
                  <Icon name="account_circle" className="text-base" /> Profile
                </Link>
                <Link
                  href="/privacy"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                >
                  <Icon name="shield" className="text-base" /> Privacy
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container-low"
                >
                  <Icon name="logout" className="text-base" /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="flex justify-around border-t border-outline-variant bg-surface md:hidden">
        {NAV.map((n) => {
          const active =
            pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-on-surface-variant"
              )}
            >
              <Icon name={n.icon} className="text-lg" filled={active} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
