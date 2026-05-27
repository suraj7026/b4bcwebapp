"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardStatsAction } from "@/app/actions/queries";
import { Card, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const ICONS = [
  "trending_up",
  "psychology",
  "lightbulb",
  "factory",
  "construction",
  "spa",
  "shopping_bag",
  "account_balance",
  "biotech",
  "design_services",
];

export default function DashboardPage() {
  const statsQ = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboardStatsAction(),
    staleTime: 60_000,
  });

  const industries = statsQ.data?.industries ?? [];
  const totalMembers = statsQ.data?.totalMembers ?? 0;

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-on-surface-variant">B4BC Connect</p>
          <h1 className="text-4xl font-bold tracking-tight">
            Industries Dashboard
          </h1>
        </div>
        <Link href="/directory">
          <Button>
            <Icon name="business_center" className="text-base" />
            Browse Directory
          </Button>
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wider text-outline">
              Total Businesses
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {totalMembers.toLocaleString()}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wider text-outline">
              Industries
            </p>
            <p className="mt-2 text-3xl font-semibold">{industries.length}</p>
          </CardBody>
        </Card>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Browse by industry</h2>
            <p className="text-sm text-on-surface-variant">
              Filter the directory to members in a specific industry segment.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statsQ.isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-surface-container-low"
                />
              ))
            : industries.map((ind, idx) => (
                <Link
                  key={ind.id}
                  href={{
                    pathname: "/directory",
                    query: { industry: String(ind.id) },
                  }}
                  className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-on-primary"
                    style={{ backgroundColor: ind.accent_color }}
                  >
                    <Icon
                      name={ICONS[idx % ICONS.length]}
                      className="text-xl"
                    />
                  </div>
                  <h3 className="text-base font-semibold text-on-surface">
                    {ind.name}
                  </h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {ind.member_count}{" "}
                    {ind.member_count === 1 ? "member" : "members"}
                  </p>
                  {ind.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-outline">
                      {ind.description}
                    </p>
                  ) : null}
                </Link>
              ))}
        </div>
      </section>
    </main>
  );
}
