"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api/client";
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
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => client.me() });
  const industriesQ = useQuery({
    queryKey: ["industries"],
    queryFn: () => client.industries(),
  });
  const membersQ = useQuery({
    queryKey: ["members", { limit: 1 }],
    queryFn: () => client.members({ limit: 1 }),
  });
  const favoritesQ = useQuery({
    queryKey: ["favorites"],
    queryFn: () => client.favorites(),
  });

  const totals = useMemo(() => {
    const indCount = industriesQ.data?.items.length ?? 0;
    const memberCount = membersQ.data?.total ?? 0;
    const favoritesCount = favoritesQ.data?.items.length ?? 0;
    return { indCount, memberCount, favoritesCount };
  }, [industriesQ.data, membersQ.data, favoritesQ.data]);

  const industries = industriesQ.data?.items ?? [];

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-on-surface-variant">
            Welcome, {meQ.data?.displayName ?? "B4BC operator"}
          </p>
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wider text-outline">
              Total Businesses
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {totals.memberCount.toLocaleString()}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wider text-outline">
              Industries
            </p>
            <p className="mt-2 text-3xl font-semibold">{totals.indCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wider text-outline">
              Your Favorites
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {totals.favoritesCount}
            </p>
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
          {industriesQ.isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-surface-container-low"
                />
              ))
            : industries.map((ind, idx) => (
                <Link
                  key={ind.id}
                  href={{ pathname: "/directory", query: { industry: ind.id } }}
                  className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-on-primary"
                    style={{ backgroundColor: ind.accentColor }}
                  >
                    <Icon
                      name={ICONS[idx % ICONS.length]}
                      className="text-xl"
                    />
                  </div>
                  <h3 className="text-base font-semibold text-on-surface">
                    {ind.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                    {ind.description || "B4BC industry segment"}
                  </p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-outline">
                    {ind.memberCount} member
                    {ind.memberCount === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
        </div>
      </section>
    </main>
  );
}
