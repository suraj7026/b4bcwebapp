"use client";

import Link from "next/link";
import { Logo } from "@/components/directory/logo";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { DirectoryMember } from "@/types/database";

type RecommendedMember = DirectoryMember & {
  match_percent?: number;
};

export const INDUSTRY_ICONS = [
  "trending_up",
  "restaurant",
  "account_balance",
  "factory",
  "architecture",
  "eco",
  "school",
  "balance",
  "biotech",
  "design_services",
];

const PARTNER_ACCENTS = [
  "#003ec7",
  "#0a66c2",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

const MATCH_BADGES = [
  "bg-green-100 text-green-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
];

const RECOMMENDED_BANNERS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCenXUwfl_5jIll8z-Mf9jTW1x7jlbMSGFYNbARMPg8po5ZNJnyl4KUZ19KHimrQE4NZumDbS3GJ-gOMf2qfq65snF-Pw8Lopehgd5REZB12xVHd7iml56Ma78LT9ub1O35nw69rSOdpftJEQljlZjrAKMAOY8OIAxfEw_PsBLMOqn8kggY5m16p5ZVIGef1x_TtcShj9V58VDAKB3cAbqIkXsK7JCSzuVXza80f0iKNYLht7CCr9Xvn-JhwAumrgjVEpQkA3DkoHNQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCIRsaU-HzyHqHMvKsfLlFyRygK71_jB3LUufQn_ThmOwxnKpPfkhaQALvxYuA8hBC0CBHZDEnI6GvbTlRqdcluJG0fEszE9eUx9R_blFFUlrHHCqziN4jbW0VUJQTpkY6Rh0s1i4wJgaBdJnR0Ah9APZkOpFUMwV1WVmgCDAQr2FQcg3p5zTPM4HYEMJC6Tww3jPyAHA6sBQl7mq1ZTMmfriDjxWocwL2dk-W8FuXJvfnbTPVnKcm47wCQq9YcCOQYYQukq5BZRqnu",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBzVpgRW82RQpl99Yo4tzeQsQrAWc7sqQzgup8HWVhHNbG1KlxEToDBt1KSMACe_xZJAfo-4HbaVuP96kGISUv2CMQCz68WQ_NDVSPHMN-trV_GEP6-okZpQQctJUtzEsmPY-4J-FnEeSYWmplTe5ThZU0Vg3gKegRxpHa_11CRMQtB0n_fteRYqlU6Fs72z0y0QGOJuKcQ4q7PbwEMksH3HEFYit0gJyqmewQcHjJ0xIW3hdJWW9oDEjHVHK1tEPPJmbtX8-1YPInq",
];

export function StitchIcon({
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

function memberTitle(member: DirectoryMember) {
  return member.company_name || member.contact_name || "Untitled";
}

function memberIndustry(member: DirectoryMember) {
  return member.industry_name || member.industry_text || "B4BC Member";
}

function memberLocation(member: DirectoryMember) {
  return member.zone_name || member.city || member.state || "Member Network";
}

function memberSummary(member: DirectoryMember) {
  return (
    member.business_nature ||
    member.description ||
    "Business profile information will be added soon."
  );
}

function matchPercent(index: number) {
  return Math.max(84, 98 - index * 3);
}

export function RecommendedPartnerCard({
  member,
  index,
}: {
  member: RecommendedMember;
  index: number;
}) {
  const title = memberTitle(member);
  const industry = memberIndustry(member);
  const location = memberLocation(member);
  const accent =
    member.industry_accent_color ??
    PARTNER_ACCENTS[index % PARTNER_ACCENTS.length];
  const percent = member.match_percent ?? matchPercent(index);

  return (
    <article className="group overflow-hidden rounded-xl border border-border-subtle bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md">
      <div
        aria-hidden="true"
        className="relative h-32 bg-cover bg-center"
        style={{ backgroundImage: `url(${RECOMMENDED_BANNERS[index % 3]})` }}
      >
        <div className="absolute inset-0 bg-primary-container/65" />
        <div className="absolute -bottom-6 left-6 rounded-xl border border-border-subtle bg-white p-2 shadow-md">
          <Logo label={title} size={64} accent={accent} />
        </div>
      </div>
      <div className="space-y-4 p-6 pt-10">
        <div>
          <h3 className="text-[18px] font-semibold leading-6 text-on-surface transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="text-[12px] font-medium uppercase leading-4 text-text-muted">
            {industry}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-surface-container-high px-2 py-1 text-[10px] font-medium leading-3 text-on-surface-variant">
            {industry}
          </span>
          <span className="rounded-md bg-surface-container-high px-2 py-1 text-[10px] font-medium leading-3 text-on-surface-variant">
            {location}
          </span>
          <span className="rounded-md bg-green-100 px-2 py-1 text-[10px] font-bold leading-3 text-green-700">
            {percent}% Match
          </span>
        </div>
        <p className="line-clamp-2 text-[14px] leading-5 text-on-surface-variant">
          {memberSummary(member)}
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link
            href={`/directory/${member.id}`}
            prefetch={false}
            className="flex h-9 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-[12px] font-semibold leading-4 text-white transition-colors hover:bg-primary-container active:scale-95"
          >
            Connect
          </Link>
          <button
            type="button"
            aria-label={`Save ${title}`}
            className="flex size-9 items-center justify-center rounded-lg border border-border-subtle text-primary transition-colors hover:bg-surface-container"
          >
            <StitchIcon name="bookmark" className="text-[20px]" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function DirectoryPartnerCard({
  member,
  index,
}: {
  member: DirectoryMember;
  index: number;
}) {
  const title = memberTitle(member);
  const industry = memberIndustry(member);
  const accent =
    member.industry_accent_color ??
    PARTNER_ACCENTS[index % PARTNER_ACCENTS.length];
  const badgeClass = MATCH_BADGES[index % MATCH_BADGES.length];
  const secondaryChip = member.zone_name || member.city || member.state;

  return (
    <article className="group rounded-xl border border-border-subtle bg-white p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface-container-low p-2">
          <Logo label={title} size={64} accent={accent} />
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[12px] font-bold leading-4",
            badgeClass
          )}
        >
          {matchPercent(index)}% Match
        </span>
      </div>

      <h3 className="mb-1 text-[18px] font-semibold leading-6 text-on-surface transition-colors group-hover:text-primary">
        {title}
      </h3>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded bg-surface-container px-2 py-0.5 text-[12px] font-semibold uppercase leading-4 text-secondary">
          {industry}
        </span>
        {secondaryChip ? (
          <span className="rounded bg-surface-container px-2 py-0.5 text-[12px] font-semibold uppercase leading-4 text-secondary">
            {secondaryChip}
          </span>
        ) : null}
      </div>
      <p className="mb-6 line-clamp-2 text-[14px] leading-5 text-secondary">
        {memberSummary(member)}
      </p>
      <div className="flex items-center gap-3">
        <Link
          href={`/directory/${member.id}`}
          prefetch={false}
          className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-[14px] font-semibold leading-5 text-white transition-all hover:bg-primary-container active:scale-95"
        >
          Connect
        </Link>
        <button
          type="button"
          aria-label={`Save ${title}`}
          className="flex size-10 items-center justify-center rounded-lg border border-border-subtle text-secondary transition-all hover:bg-surface-container-low hover:text-primary active:scale-95"
        >
          <StitchIcon name="bookmark" className="text-[22px]" />
        </button>
      </div>
    </article>
  );
}
