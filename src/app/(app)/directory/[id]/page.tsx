"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  fetchIndustriesAction,
  fetchMemberAction,
} from "@/app/actions/queries";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardBody, Chip } from "@/components/ui/card";
import { Logo } from "@/components/directory/logo";

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const memberQ = useQuery({
    queryKey: ["member", id],
    queryFn: () => fetchMemberAction(id),
  });
  const industriesQ = useQuery({
    queryKey: ["industries"],
    queryFn: () => fetchIndustriesAction(),
    staleTime: 5 * 60_000,
  });

  const m = memberQ.data;
  const industry = useMemo(
    () =>
      m?.industry_id
        ? industriesQ.data?.find((i) => i.id === m.industry_id) ?? null
        : null,
    [industriesQ.data, m]
  );

  if (memberQ.isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] px-5 py-10">
        <div className="h-64 animate-pulse rounded-xl bg-surface-container-low" />
      </div>
    );
  }

  if (memberQ.isError || !m) {
    return (
      <div className="mx-auto max-w-[1100px] px-5 py-10 text-center">
        <h1 className="text-2xl font-semibold">Member not found</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          This profile may have been removed.
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

  const title = m.company_name || m.contact_name || "Untitled";
  const about = m.description ?? m.business_nature;
  const businessFacts = [
    { label: "Designation", value: m.designation },
    { label: "Sector", value: m.sector },
    { label: "Industry", value: m.industry_text },
    { label: "Business nature", value: m.business_nature },
    { label: "Business location", value: m.business_location },
    { label: "Chapter", value: m.chapter_name },
    { label: "Member ID", value: m.registered_id },
  ].filter((item) => item.value);

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
                accent={
                  industry?.accent_color ?? m.industry_accent_color ?? undefined
                }
              />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                      {title}
                    </h1>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {industry?.name ?? m.industry_name ?? "B4BC Member"}
                      {m.zone_name ? ` • ${m.zone_name}` : ""}
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

            {about ? (
              <section>
                <h2 className="text-lg font-semibold">About</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                  {about}
                </p>
              </section>
            ) : null}

            {businessFacts.length ? (
              <section>
                <h2 className="text-lg font-semibold">Business profile</h2>
                <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {businessFacts.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-outline-variant bg-surface-container-low p-3"
                    >
                      <dt className="text-xs font-medium uppercase tracking-wider text-outline">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-on-surface">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {m.sector ? (
              <section>
                <h2 className="text-lg font-semibold">Sector</h2>
                <div className="mt-2">
                  <Chip>{m.sector}</Chip>
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
        </aside>
      </div>
    </main>
  );
}
