"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/utils/supabase/client";

export const dynamic = "force-dynamic";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === "password") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        const next = search.get("next") ?? "/directory";
        router.replace(next);
        router.refresh();
      } else {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/directory`
                : undefined,
          },
        });
        if (err) throw err;
        setNotice("Check your inbox for a sign-in link.");
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not sign in. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgot() {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/profile?reset=1`
              : undefined,
        }
      );
      if (err) throw err;
      setNotice("Reset link sent. Check your email.");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not send reset link.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[60%] -right-[5%] h-[50%] w-[30%] rounded-full bg-tertiary/5 blur-[100px]" />
      </div>

      <header className="mb-10 flex flex-col items-center text-center">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="business_center" className="text-3xl text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            B4BC Connect
          </h1>
        </div>
        <p className="text-sm text-secondary">
          Empowering professional connections
        </p>
      </header>

      <section className="z-10 w-full max-w-[440px] rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-on-surface">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Sign in with your B4BC email.
          </p>
        </div>

        <div className="mb-4 inline-flex rounded-lg border border-outline-variant p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={
              "rounded-md px-3 py-1.5 font-medium transition-colors " +
              (mode === "password"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-low")
            }
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={
              "rounded-md px-3 py-1.5 font-medium transition-colors " +
              (mode === "magic"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-low")
            }
          >
            Magic link
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            placeholder="you@example.com"
            leadingIcon="mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode === "password" ? (
            <Input
              label="Password"
              placeholder="••••••••"
              leadingIcon="lock"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              trailing={
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                  className="rounded p-1 text-outline hover:text-on-surface-variant"
                >
                  <Icon name={showPw ? "visibility_off" : "visibility"} />
                </button>
              }
            />
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container/40 p-3 text-sm text-on-error-container">
              <Icon name="error" className="mt-0.5 text-base" />
              <span>{error}</span>
            </div>
          ) : null}
          {notice ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              <Icon name="check_circle" className="mt-0.5 text-base" />
              <span>{notice}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            loading={submitting}
            className="w-full"
          >
            {mode === "password"
              ? submitting
                ? "Signing in…"
                : "Sign in"
              : submitting
                ? "Sending link…"
                : "Send magic link"}
          </Button>

          {mode === "password" ? (
            <div className="text-right">
              <button
                type="button"
                onClick={onForgot}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                disabled={submitting}
              >
                Forgot password?
              </button>
            </div>
          ) : null}
        </form>

        <footer className="mt-6 border-t border-outline-variant pt-4 text-center text-xs text-on-surface-variant">
          <p>
            Need access?{" "}
            <Link
              href="mailto:support@b4bc.org"
              className="font-semibold text-primary hover:underline"
            >
              Contact the B4BC team
            </Link>
          </p>
        </footer>
      </section>

      <footer className="mt-10 text-center text-xs text-outline">
        <p>© {new Date().getFullYear()} B4BC Connect Business Directory.</p>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
