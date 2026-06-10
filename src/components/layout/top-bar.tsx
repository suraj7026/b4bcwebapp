"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { HeaderActivityCounts } from "@/app/actions/app-queries";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { label: "My Dashboard", href: "/directory", icon: "dashboard" },
  { label: "Public Feed", href: "/feed", icon: "rss_feed" },
  {
    label: "Find Partners",
    href: "/find-partners",
    icon: "handshake",
  },
  { label: "Messages", href: "/messages", icon: "chat" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

const MOBILE_NAV = [
  { label: "Dashboard", href: "/directory", icon: "dashboard" },
  { label: "Feed", href: "/feed", icon: "rss_feed" },
  { label: "Partners", href: "/find-partners", icon: "handshake" },
  { label: "Messages", href: "/messages", icon: "chat" },
];

function MaterialIcon({
  name,
  filled,
  className,
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return <Icon name={name} filled={filled} className={className} />;
}

function isActive(pathname: string, href: string, label: string) {
  const targetPath = href.split("#")[0];
  if (label === "My Dashboard") return pathname === "/directory";
  if (label === "Find Partners") {
    return pathname.startsWith("/find-partners") || pathname.startsWith("/directory/");
  }
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function TopBar({
  user,
  activityCounts,
}: {
  user: SessionUser;
  activityCounts: HeaderActivityCounts;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const displayName = user.displayName || "B4BC Member";
  const role = user.zone || "Member Network";

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-dvh w-[280px] flex-col border-r border-border-subtle bg-surface-container-low p-6 lg:flex">
        <Link href="/directory" className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-container text-on-primary">
            <MaterialIcon
              name="business_center"
              filled
              className="text-[22px]"
            />
          </div>
          <div>
            <p className="text-[18px] font-extrabold leading-6 text-primary">
              B4BC Connect
            </p>
            <p className="text-[12px] font-medium leading-4 text-on-surface-variant">
              Member Dashboard
            </p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-2 pt-4">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href, item.label);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-[12px] font-medium leading-4 transition-all active:scale-95",
                  active
                    ? "border-primary bg-primary-container text-on-primary-container"
                    : "border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                )}
              >
                <MaterialIcon
                  name={item.icon}
                  filled={active}
                  className="text-[24px]"
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border-subtle pt-6">
          <Link
            href="/directory#post-requirement"
            prefetch={false}
            className="mb-6 flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-[12px] font-semibold leading-4 text-on-primary shadow-sm transition-opacity hover:opacity-90 active:scale-95"
          >
            Post Requirement
          </Link>
          <div className="space-y-1">
            <Link
              href="/settings"
              prefetch={false}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-[12px] font-medium leading-4 text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface"
            >
              <MaterialIcon name="help" className="text-[24px]" />
              Help Center
            </Link>
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => logoutAction())}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[12px] font-medium leading-4 text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
            >
              <MaterialIcon name="logout" className="text-[24px]" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <header className="fixed left-[280px] right-0 top-0 z-40 hidden h-16 items-center justify-between border-b border-border-subtle bg-surface-container-lowest px-margin-desktop shadow-sm lg:flex">
        <div className="relative w-96">
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 text-[22px] text-on-surface-variant -translate-y-1/2"
          />
          <input
            className="h-10 w-full rounded-full border-0 bg-surface-container py-2 pl-10 pr-4 text-[14px] leading-5 text-on-surface outline-none transition focus:ring-2 focus:ring-primary"
            placeholder="Search for partners or requirements..."
            type="search"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              prefetch={false}
              aria-label="Notifications"
              className="relative text-on-surface-variant transition-colors hover:text-primary"
            >
              <MaterialIcon name="notifications" className="text-[24px]" />
              <Badge count={activityCounts.unreadNotifications} />
            </Link>
            <Link
              href="/messages"
              prefetch={false}
              aria-label="Messages"
              className="relative text-on-surface-variant transition-colors hover:text-primary"
            >
              <MaterialIcon name="mail" className="text-[24px]" />
              <Badge count={activityCounts.unreadMessages} />
            </Link>
          </div>
          <div className="h-8 w-px bg-border-subtle" />
          <Link href="/profile" prefetch={false} className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary-fixed text-[13px] font-bold text-primary">
              {displayName[0]?.toUpperCase() ?? "B"}
            </div>
            <div className="hidden text-left xl:block">
              <p className="text-[12px] font-bold leading-4 text-on-surface">
                {displayName}
              </p>
              <p className="text-[10px] font-medium leading-3 text-on-surface-variant">
                {role}
              </p>
            </div>
          </Link>
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-container-lowest/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-margin-mobile">
          <Link href="/directory" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-container text-on-primary">
              <MaterialIcon
                name="business_center"
                filled
                className="text-[20px]"
              />
            </div>
            <span className="text-[17px] font-extrabold text-primary">
              B4BC Connect
            </span>
          </Link>
          <div className="flex items-center gap-3 text-on-surface-variant">
            <Link
              href="/notifications"
              prefetch={false}
              aria-label="Notifications"
              className="relative transition-colors hover:text-primary"
            >
              <MaterialIcon name="notifications" className="text-[22px]" />
              <Badge count={activityCounts.unreadNotifications} />
            </Link>
            <Link
              href="/messages"
              prefetch={false}
              aria-label="Messages"
              className="relative transition-colors hover:text-primary"
            >
              <MaterialIcon name="mail" className="text-[22px]" />
              <Badge count={activityCounts.unreadMessages} />
            </Link>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 justify-around border-t border-border-subtle bg-surface-container-lowest px-2 shadow-lg lg:hidden">
        {MOBILE_NAV.map((item) => {
          const targetPath = item.href.split("#")[0];
          const active =
            item.label === "Dashboard"
              ? pathname === "/directory"
              : item.label === "Partners"
              ? pathname.startsWith("/find-partners") ||
                pathname.startsWith("/directory/")
              : pathname === targetPath || pathname.startsWith(`${targetPath}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                active
                  ? "font-semibold text-primary"
                  : "text-on-surface-variant"
              )}
            >
              <MaterialIcon
                name={item.icon}
                filled={active}
                className="text-[23px]"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
