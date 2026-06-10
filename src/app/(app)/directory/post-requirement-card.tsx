"use client";

import { useState, useTransition } from "react";
import {
  createRequirementAction,
  type CreateRequirementResult,
} from "@/app/actions/app-queries";
import { StitchIcon } from "@/components/directory/partner-cards";
import { cn } from "@/lib/utils";

export function PostRequirementCard({
  onPosted,
}: {
  onPosted?: (result: CreateRequirementResult) => void;
}) {
  const [requirement, setRequirement] = useState("");
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRequirementSubmit = () => {
    if (!requirement.trim()) return;
    setError(null);

    startTransition(() => {
      void (async () => {
        const result = await createRequirementAction({ body: requirement });
        if (!result.ok) {
          setError(result.error ?? "Unable to post requirement.");
          return;
        }
        setPosted(true);
        setRequirement("");
        onPosted?.(result);
        window.setTimeout(() => setPosted(false), 3000);
      })();
    });
  };

  return (
    <>
      <article className="rounded-xl border border-border-subtle bg-surface-container-lowest p-6 shadow-sm md:p-8 xl:col-span-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary-container/10 p-2">
            <StitchIcon name="campaign" className="text-[24px] text-primary" />
          </div>
          <h2 className="text-[18px] font-semibold leading-6 text-on-surface">
            Post a New Requirement
          </h2>
        </div>
        <div className="relative">
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="min-h-36 w-full resize-none rounded-xl border border-border-subtle bg-surface-container-low p-5 text-[14px] leading-5 text-on-surface outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary"
            placeholder="What are you looking for? (e.g., 'Seeking a sustainable packaging supplier for Q1 rollout in Europe')"
            rows={4}
          />
          <div className="mt-4 flex flex-wrap justify-end gap-3 md:absolute md:bottom-4 md:right-4 md:mt-0">
            <button
              type="button"
              onClick={handleRequirementSubmit}
              disabled={isPending || !requirement.trim()}
              className="h-9 rounded-lg bg-primary px-6 text-[12px] font-semibold leading-4 text-white shadow-md transition-all hover:bg-primary-container active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Posting..." : "Submit Post"}
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-[13px] font-medium text-error">{error}</p>
        ) : null}
      </article>

      <div
        aria-live="polite"
        className={cn(
          "fixed bottom-24 right-6 z-[100] flex items-center gap-3 rounded-xl bg-primary px-6 py-4 text-white shadow-2xl transition-all duration-500 lg:bottom-10",
          posted ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        )}
      >
        <StitchIcon name="check_circle" className="text-[22px]" />
        <span className="text-[14px] leading-5">
          Requirement posted successfully.
        </span>
      </div>
    </>
  );
}
