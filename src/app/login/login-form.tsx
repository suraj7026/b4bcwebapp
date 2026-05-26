"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { client, ApiError } from "@/lib/api/client";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await client.login(username.trim(), password);
      const next = search.get("next") ?? "/directory";
      router.replace(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body.message || "Invalid username or password.");
      } else {
        setError("Could not sign in. Try again.");
      }
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
            Sign in with your B4BC operator credentials.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Username"
            placeholder="b4bc_admin or b4bc_west"
            leadingIcon="person"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
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

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container/40 p-3 text-sm text-on-error-container">
              <Icon name="error" className="mt-0.5 text-base" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            loading={submitting}
            className="w-full"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
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
