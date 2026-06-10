import Link from "next/link";
import { fetchNotificationsAction } from "@/app/actions/app-queries";
import { Card, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await fetchNotificationsAction();

  return (
    <main className="mx-auto max-w-[980px] px-5 py-8 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-outline">
            Notifications
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-on-surface">
            Member activity
          </h1>
        </div>
        <Link
          href="/messages"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
        >
          <Icon name="mail" />
          Messages
        </Link>
      </header>

      <Card>
        <CardBody className="p-0">
          {notifications.length === 0 ? (
            <div className="p-6 text-sm text-on-surface-variant">
              No notifications yet.
            </div>
          ) : null}

          <div className="divide-y divide-border-subtle">
            {notifications.map((item) => (
              <article
                key={item.id}
                className={cn(
                  "flex gap-4 p-5",
                  item.isRead ? "bg-white" : "bg-primary-fixed/40"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
                    item.isRead
                      ? "bg-surface-container-high text-on-surface-variant"
                      : "bg-primary text-on-primary"
                  )}
                >
                  <Icon name="notifications" className="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-on-surface">
                      {item.title}
                    </h2>
                    <span className="text-xs text-on-surface-variant">
                      {item.time}
                    </span>
                  </div>
                  {item.body ? (
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                      {item.body}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
