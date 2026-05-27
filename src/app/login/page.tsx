"use client";

import { Suspense, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { loginAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

function LoginForm() {
  const search = useSearchParams();
  const rawNext = search.get("next") ?? "/directory";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/directory";

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginAction(input, next);
      if (result && !result.ok) {
        setError(result.error ?? "Could not sign in.");
      }
    });
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Enter the email address or phone number on your B4BC member record."
      footer={
        <p>
          Need help?{" "}
          <a
            href="mailto:support@b4bc.org"
            className="font-semibold text-primary hover:underline"
          >
            Contact the B4BC team
          </a>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email or phone"
          placeholder="you@example.com or 9876543210"
          leadingIcon="person"
          autoComplete="username"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          required
        />

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container/40 p-3 text-sm text-on-error-container">
            <Icon name="error" className="mt-0.5 text-base" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" loading={isPending} className="w-full">
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
