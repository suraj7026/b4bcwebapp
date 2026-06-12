"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export default function AppRouteError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error("[app-route] render failed", error);
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-5 py-12 lg:px-8">
      <Card className="w-full">
        <CardBody className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-error/10 text-error">
            <Icon name="error" className="text-[28px]" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-on-surface">
            This section could not load
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
            The app database is slow or unreachable right now. The directory is
            still available, but feed, messages, notifications, and settings
            need the app-owned MySQL tables to respond.
          </p>
          {error.digest ? (
            <p className="mt-3 text-xs text-outline">Error {error.digest}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {retry ? (
              <Button type="button" onClick={() => retry()}>
                <Icon name="refresh" />
                Try again
              </Button>
            ) : null}
            <Link
              href="/directory"
              prefetch={false}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-transparent px-5 text-sm font-medium tracking-[0.01em] text-on-surface transition-all hover:bg-surface-container-low active:scale-[0.98]"
            >
              Back to directory
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
