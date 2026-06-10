import Link from "next/link";
import {
  fetchDashboardStatsAction,
  fetchMembersAction,
  type MemberListFilters,
} from "@/app/actions/queries";
import {
  DirectoryPartnerCard,
  INDUSTRY_ICONS,
  StitchIcon,
} from "@/components/directory/partner-cards";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type SortValue = "name" | "-name" | "recent";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validSort(value: string | undefined): SortValue {
  return value === "-name" || value === "recent" ? value : "name";
}

function positivePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function makeHref(
  current: {
    q: string;
    industryId: string | null;
    zone: string | null;
    sort: SortValue;
    page: number;
  },
  overrides: Partial<{
    q: string | null;
    industryId: string | null;
    zone: string | null;
    sort: SortValue | null;
    page: number | null;
  }> = {},
  hash?: string
) {
  const next = {
    q: current.q,
    industryId: current.industryId,
    zone: current.zone,
    sort: current.sort,
    page: current.page,
    ...overrides,
  };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.industryId) params.set("industry", next.industryId);
  if (next.zone) params.set("zone", next.zone);
  if (next.sort && next.sort !== "name") params.set("sort", next.sort);
  if (next.page && next.page > 0) params.set("page", String(next.page));
  const query = params.toString();
  return `/find-partners${query ? `?${query}` : ""}${hash ?? ""}`;
}

export default async function FindPartnersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = first(sp.q)?.trim() ?? "";
  const industryId = first(sp.industry) ?? null;
  const zone = first(sp.zone) ?? null;
  const sort = validSort(first(sp.sort));
  const page = positivePage(first(sp.page));

  const filtersForQuery: MemberListFilters = {
    q: q || undefined,
    industryId: industryId != null ? parseInt(industryId, 10) : undefined,
    zoneId: zone ?? undefined,
    sort,
    page,
  };

  const [stats, members] = await Promise.all([
    fetchDashboardStatsAction(),
    fetchMembersAction(filtersForQuery),
  ]);

  const total = members.total;
  const items = members.items;
  const totalPages = Math.max(1, Math.ceil(total / members.pageSize));
  const currentState = { q, industryId, zone, sort, page };
  const selectedIndustry =
    industryId != null
      ? stats.industries.find((industry) => String(industry.id) === industryId)
      : null;
  const sortLabel = sort === "recent" ? "Recent" : "Relevance";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-gutter p-margin-mobile lg:p-margin-desktop">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[32px] font-bold leading-10 text-primary">
              Find Partners
            </h1>
            <p className="text-[16px] leading-6 text-text-muted">
              Search members by industry, service, location, and business need.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-white px-4 py-2 text-[12px] font-semibold leading-4 text-primary">
            <StitchIcon name="handshake" className="text-[18px]" />
            {total.toLocaleString()} matching partners
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold leading-6 text-on-surface">
                Browse by Industry
              </h2>
              <p className="text-[14px] leading-5 text-text-muted">
                Select a segment to filter the partner directory below.
              </p>
            </div>
            {selectedIndustry ? (
              <Link
                href={makeHref(
                  currentState,
                  { industryId: null, page: null },
                  "#partner-directory"
                )}
                prefetch={false}
                className="rounded-lg border border-border-subtle bg-white px-4 py-2 text-[14px] font-medium leading-5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                Clear {selectedIndustry.name}
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.industries.map((industry, index) => {
              const active = industryId === String(industry.id);
              return (
                <Link
                  key={industry.id}
                  href={makeHref(
                    currentState,
                    {
                      q: null,
                      industryId: String(industry.id),
                      page: null,
                    },
                    "#partner-directory"
                  )}
                  prefetch={false}
                  className={cn(
                    "group rounded-xl border bg-surface-container-lowest p-5 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.99]",
                    active ? "border-primary bg-primary/5" : "border-border-subtle"
                  )}
                >
                  <div
                    className="mb-4 flex size-11 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: industry.accent_color }}
                  >
                    <StitchIcon
                      name={INDUSTRY_ICONS[index % INDUSTRY_ICONS.length]}
                      className="text-[22px]"
                    />
                  </div>
                  <h3 className="text-[14px] font-semibold leading-5 text-on-surface">
                    {industry.name}
                  </h3>
                  <p className="mt-1 text-[14px] leading-5 text-text-muted">
                    {industry.member_count}{" "}
                    {industry.member_count === 1 ? "member" : "members"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="partner-directory" className="scroll-mt-24 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="mb-1 text-[24px] font-semibold leading-8 text-on-surface">
                Partner Directory
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] leading-5 text-secondary">
                  Showing results for:
                </span>
                {selectedIndustry ? (
                  <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[12px] font-semibold leading-4 text-primary">
                    Industry: {selectedIndustry.name}
                    <Link
                      aria-label="Clear industry filter"
                      href={makeHref(
                        currentState,
                        { industryId: null, page: null },
                        "#partner-directory"
                      )}
                      prefetch={false}
                      className="flex items-center"
                    >
                      <StitchIcon name="close" className="text-[14px]" />
                    </Link>
                  </span>
                ) : (
                  <span className="rounded-full border border-border-subtle bg-white px-3 py-1 text-[12px] font-semibold leading-4 text-on-surface-variant">
                    All industries
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <form action="/find-partners" className="relative w-full sm:w-72">
                {industryId ? (
                  <input name="industry" type="hidden" value={industryId} />
                ) : null}
                {zone ? <input name="zone" type="hidden" value={zone} /> : null}
                {sort !== "name" ? (
                  <input name="sort" type="hidden" value={sort} />
                ) : null}
                <StitchIcon
                  name="search"
                  className="absolute left-3 top-1/2 text-[20px] text-on-surface-variant -translate-y-1/2"
                />
                <input
                  name="q"
                  defaultValue={q}
                  className="h-10 w-full rounded-lg border border-border-subtle bg-white py-2 pl-10 pr-4 text-[14px] leading-5 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Search members, services, or locations..."
                  type="search"
                />
              </form>
              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 text-[14px] font-medium leading-5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                <StitchIcon name="tune" className="text-[20px]" />
                Filters
              </button>
              <Link
                href={makeHref(
                  currentState,
                  {
                    sort: sort === "recent" ? "name" : "recent",
                    page: null,
                  },
                  "#partner-directory"
                )}
                prefetch={false}
                className="flex h-10 items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 text-[14px] font-medium leading-5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                Sort by: {sortLabel}
                <StitchIcon name="expand_more" className="text-[20px]" />
              </Link>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-white p-12 text-center">
              <StitchIcon
                name="search_off"
                className="text-[36px] text-outline"
              />
              <h3 className="mt-3 text-[18px] font-semibold leading-6">
                No businesses found
              </h3>
              <p className="mt-1 text-[14px] leading-5 text-on-surface-variant">
                No matches for your current filters.
              </p>
              <Link
                href="/find-partners"
                prefetch={false}
                className="mt-4 inline-flex rounded-lg border border-border-subtle px-4 py-2 text-[14px] font-medium leading-5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {items.map((member, index) => (
                  <DirectoryPartnerCard
                    key={member.id}
                    member={member}
                    index={index + page * members.pageSize}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Link
                    aria-disabled={page === 0}
                    href={
                      page === 0
                        ? "#partner-directory"
                        : makeHref(
                            currentState,
                            { page: page - 1 },
                            "#partner-directory"
                          )
                    }
                    prefetch={false}
                    className={cn(
                      "flex h-9 items-center gap-1 rounded-lg border border-border-subtle bg-white px-3 text-[14px] font-medium leading-5 text-on-surface-variant transition-colors hover:bg-surface-container-low",
                      page === 0 && "pointer-events-none opacity-50"
                    )}
                  >
                    <StitchIcon name="chevron_left" className="text-[20px]" />
                    Previous
                  </Link>
                  <span className="px-3 text-[14px] leading-5 text-on-surface-variant">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Link
                    aria-disabled={page + 1 >= totalPages}
                    href={
                      page + 1 >= totalPages
                        ? "#partner-directory"
                        : makeHref(
                            currentState,
                            { page: page + 1 },
                            "#partner-directory"
                          )
                    }
                    prefetch={false}
                    className={cn(
                      "flex h-9 items-center gap-1 rounded-lg border border-border-subtle bg-white px-3 text-[14px] font-medium leading-5 text-on-surface-variant transition-colors hover:bg-surface-container-low",
                      page + 1 >= totalPages && "pointer-events-none opacity-50"
                    )}
                  >
                    Next
                    <StitchIcon name="chevron_right" className="text-[20px]" />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
