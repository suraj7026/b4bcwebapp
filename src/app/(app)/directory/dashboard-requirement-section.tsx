"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CreateRequirementResult,
  DashboardHomeSnapshot,
} from "@/app/actions/app-queries";
import {
  RecommendedPartnerCard,
  StitchIcon,
} from "@/components/directory/partner-cards";
import type { PartnerRecommendation } from "@/types/database";
import { PostRequirementCard } from "@/app/(app)/directory/post-requirement-card";

function formatCount(value: number): string {
  return value < 10 ? String(value).padStart(2, "0") : value.toLocaleString();
}

export function DashboardRequirementSection({
  dashboard,
}: {
  dashboard: DashboardHomeSnapshot;
}) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<
    PartnerRecommendation[]
  >([]);
  const [activeRequirements, setActiveRequirements] = useState(
    dashboard.activeRequirements
  );

  const handlePosted = (result: CreateRequirementResult) => {
    setRecommendations(result.recommendations ?? []);
    setActiveRequirements((count) => count + 1);
    router.refresh();
  };

  return (
    <>
      <section
        id="post-requirement"
        className="grid scroll-mt-24 grid-cols-1 gap-6 xl:grid-cols-12"
      >
        <PostRequirementCard onPosted={handlePosted} />

        <aside className="flex flex-col gap-6 xl:col-span-4">
          <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-container-lowest p-6 shadow-sm">
            <div>
              <p className="mb-1 text-[12px] font-semibold uppercase leading-4 text-text-muted">
                Active Requirements
              </p>
              <p className="text-[18px] font-semibold leading-6 text-primary">
                {formatCount(activeRequirements)}
              </p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full bg-tertiary-fixed">
              <StitchIcon
                name="assignment_late"
                className="text-[24px] text-tertiary"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-container-lowest p-6 shadow-sm">
            <div>
              <p className="mb-1 text-[12px] font-semibold uppercase leading-4 text-text-muted">
                Partner Requests
              </p>
              <p className="text-[18px] font-semibold leading-6 text-primary">
                {formatCount(dashboard.partnerRequests)}
              </p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-fixed">
              <StitchIcon
                name="group_add"
                className="text-[24px] text-on-primary-fixed-variant"
              />
            </div>
          </div>
        </aside>
      </section>

      {recommendations.length ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[18px] font-semibold leading-6 text-on-surface">
              Recommended Partners for Your Current Needs
            </h2>
            <Link
              href="/find-partners"
              prefetch={false}
              className="flex items-center gap-1 text-[12px] font-medium leading-4 text-primary hover:underline"
            >
              View All Partners
              <StitchIcon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((member, index) => (
              <RecommendedPartnerCard
                key={member.id}
                member={member}
                index={index}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
