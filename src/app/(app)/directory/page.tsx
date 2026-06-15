import Link from "next/link";
import {
  fetchDashboardHomeAction,
  type NetworkActivityItem,
} from "@/app/actions/app-queries";
import { StitchIcon } from "@/components/directory/partner-cards";
import { DashboardRequirementSection } from "@/app/(app)/directory/dashboard-requirement-section";
import { getSessionUser } from "@/lib/auth";

function firstName(displayName: string | null | undefined) {
  return displayName?.trim().split(/\s+/)[0] || "Member";
}

function activityToneClass(tone: NetworkActivityItem["tone"]) {
  if (tone === "tertiary") {
    return "bg-tertiary-fixed text-tertiary";
  }
  if (tone === "secondary") {
    return "bg-secondary-fixed text-on-secondary-container";
  }
  return "bg-primary-fixed text-primary";
}

function ActivityRow({ item }: { item: NetworkActivityItem }) {
  return (
    <div className="flex gap-4">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${activityToneClass(
          item.tone
        )}`}
      >
        {item.iconName ? (
          <StitchIcon name={item.iconName} className="text-[18px]" />
        ) : (
          <span className="text-[13px] font-bold">{item.actorInitial}</span>
        )}
      </div>
      <div>
        <p className="text-[14px] leading-5 text-on-surface">
          {item.actorName ? <strong>{item.actorName}</strong> : null}
          {item.actorName ? " " : null}
          {item.summary}
        </p>
        <p className="text-[12px] font-medium leading-4 text-text-muted">
          {item.time}
        </p>
      </div>
    </div>
  );
}

export default async function DirectoryPage() {
  const [dashboard, user] = await Promise.all([
    fetchDashboardHomeAction(),
    getSessionUser(),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-gutter p-margin-mobile lg:p-margin-desktop">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[32px] font-bold leading-10 text-primary">
              Good Morning, {firstName(user?.displayName)}
            </h1>
            <p className="text-[16px] leading-6 text-text-muted">
              Here&apos;s what&apos;s happening with your business network today.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-medium leading-4 text-text-muted">
            <StitchIcon name="calendar_today" className="text-[18px]" />
            June 4, 2026
          </div>
        </section>

        <DashboardRequirementSection dashboard={dashboard} />

        <section className="grid grid-cols-12 gap-6">
          <article className="col-span-12 rounded-xl border border-border-subtle bg-surface-container-low p-6 lg:col-span-7 lg:p-8">
            <h2 className="mb-6 text-[18px] font-semibold leading-6 text-on-surface">
              Recent Network Activity
            </h2>
            {dashboard.networkActivity.length ? (
              <div className="space-y-6">
                {dashboard.networkActivity.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-[14px] leading-5 text-on-surface-variant">
                No public network activity yet.
              </div>
            )}
          </article>

          <aside className="col-span-12 flex flex-col justify-between rounded-xl border border-border-subtle bg-white/80 p-6 shadow-sm backdrop-blur lg:col-span-5 lg:p-8">
            <div>
              <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <StitchIcon
                  name="lightbulb"
                  className="text-[24px] text-primary"
                />
              </div>
              <h2 className="mb-4 text-[18px] font-semibold leading-6 text-on-surface">
                Quick Tip: Maximize Visibility
              </h2>
              <p className="mb-6 text-[14px] leading-6 text-on-surface-variant">
                Members with a verified business profile receive more
                engagement. Keep your about section and core services current to
                improve matching accuracy.
              </p>
            </div>
            <Link
              href="/profile"
              className="flex h-11 w-full items-center justify-center rounded-lg border-2 border-primary px-4 text-[12px] font-bold leading-4 text-primary transition-all hover:bg-primary hover:text-white"
            >
              Optimize My Profile
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
