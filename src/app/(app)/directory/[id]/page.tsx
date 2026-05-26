"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import {
  fetchFavoriteIds,
  fetchIndustries,
  fetchMember,
  toggleFavorite,
} from "@/lib/supabase-queries";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardBody, Chip } from "@/components/ui/card";
import { ReportDialog } from "@/components/directory/report-dialog";
import { Logo } from "@/components/directory/logo";

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const sb = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);

  const userQ = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await sb.auth.getUser()).data.user,
  });
  const userId = userQ.data?.id ?? null;

  const memberQ = useQuery({
    queryKey: ["member", id],
    queryFn: () => fetchMember(sb, id),
  });
  const industriesQ = useQuery({
    queryKey: ["industries"],
    queryFn: () => fetchIndustries(sb),
    staleTime: 5 * 60_000,
  });
  const favIdsQ = useQuery({
    queryKey: ["favorite-ids", userId],
    queryFn: () => (userId ? fetchFavoriteIds(sb, userId) : new Set<string>()),
    enabled: !!userId,
  });

  const isFavorite = favIdsQ.data?.has(id) ?? false;

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      await toggleFavorite(sb, userId, id, isFavorite);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["favorite-ids", userId] }),
  });

  if (memberQ.isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] px-5 py-10">
        <div className="h-64 animate-pulse rounded-xl bg-surface-container-low" />
      </div>
    );
  }

  if (memberQ.isError || !memberQ.data) {
    return (
      <div className="mx-auto max-w-[1100px] px-5 py-10 text-center">
        <h1 className="text-2xl font-semibold">Member not found</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          This profile may have been removed or is outside of your zone.
        </p>
        <Link
          href="/directory"
          className="mt-6 inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Icon name="arrow_back" /> Back to directory
        </Link>
      </div>
    );
  }

  const m = memberQ.data;
  const industry =
    industriesQ.data?.find((i) => i.id === m.industry_id) ?? null;
  const title = m.company_name || m.contact_name || "Untitled";

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-10">
      <Link
        href="/directory"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" className="text-base" /> Directory
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardBody className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Logo
                src={m.logo_url}
                label={title}
                size={80}
                accent={industry?.accent_color ?? m.industry_accent_color ?? undefined}
              />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                      {title}
                    </h1>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {industry?.name ?? m.industry_name ?? "B4BC Member"}
                      {m.zone_name ? ` • ${m.zone_name} zone` : ""}
                    </p>
                  </div>
                  <Icon
                    name="verified"
                    filled
                    className="text-2xl text-primary"
                  />
                </div>
              </div>
            </div>

            {m.description ? (
              <section>
                <h2 className="text-lg font-semibold">About</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                  {m.description}
                </p>
              </section>
            ) : null}

            {m.services.length ? (
              <section>
                <h2 className="text-lg font-semibold">Services</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.services.map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-lg font-semibold">Location</h2>
              <div className="mt-2 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm">
                <p className="font-medium">
                  {m.address_line1 || "Address not provided"}
                </p>
                <p className="text-on-surface-variant">
                  {[m.city, m.state].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </section>
          </CardBody>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardBody className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                disabled={!m.phone}
                onClick={() => m.phone && window.open(`tel:${m.phone}`, "_self")}
              >
                <Icon name="call" className="text-base" />
                {m.phone || "Phone unavailable"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                disabled={!m.email}
                onClick={() =>
                  m.email && window.open(`mailto:${m.email}`, "_self")
                }
              >
                <Icon name="mail" className="text-base" />
                Email
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-outline">
                Business Vitals
              </p>
              <ul className="divide-y divide-outline-variant text-sm">
                <li className="flex items-center gap-3 py-2">
                  <Icon name="badge" className="text-primary" />
                  <div>
                    <p className="text-xs text-on-surface-variant">Contact</p>
                    <p className="font-medium">{m.contact_name || "—"}</p>
                  </div>
                </li>
                <li className="flex items-center gap-3 py-2">
                  <Icon name="mail" className="text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs text-on-surface-variant">Email</p>
                    <p className="truncate font-medium">{m.email || "—"}</p>
                  </div>
                </li>
                <li className="flex items-center gap-3 py-2">
                  <Icon name="public" className="text-primary" />
                  <div>
                    <p className="text-xs text-on-surface-variant">Zone</p>
                    <p className="font-medium">{m.zone_name || "—"}</p>
                  </div>
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-2">
              <Button
                variant={isFavorite ? "secondary" : "outline"}
                className="w-full"
                onClick={() => toggleFav.mutate()}
                loading={toggleFav.isPending}
              >
                <Icon
                  name="bookmark"
                  filled={isFavorite}
                  className="text-base"
                />
                {isFavorite ? "Saved to favorites" : "Save to favorites"}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-on-surface-variant"
                onClick={() => setReportOpen(true)}
              >
                <Icon name="flag" className="text-base" />
                Report this listing
              </Button>
            </CardBody>
          </Card>
        </aside>
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        memberId={id}
      />
    </main>
  );
}
