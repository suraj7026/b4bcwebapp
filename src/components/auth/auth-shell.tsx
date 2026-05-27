import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(0,62,199,0.08),transparent_30%),linear-gradient(135deg,#f7f9fc_0%,#ffffff_55%,#f5f7fb_100%)] px-5 py-8">
      <section className="grid w-full max-w-[980px] overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_24px_80px_rgba(25,28,29,0.12)] lg:grid-cols-[0.95fr_1fr]">
        <div className="relative hidden min-h-[560px] flex-col justify-between bg-primary px-10 py-10 text-on-primary lg:flex">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.16)_0%,transparent_42%),radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.24),transparent_28%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/14 text-2xl">
                <Icon name="business_center" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  B4BC Connect
                </h1>
                <p className="text-sm text-white/72">Business Directory</p>
              </div>
            </div>
            <div className="mt-20 max-w-[320px]">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/60">
                Member network
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight">
                One place to find members, zones, and business contacts.
              </h2>
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-white/12 bg-white/10 p-4">
              <p className="text-2xl font-semibold">508</p>
              <p className="mt-1 text-white/66">active listings</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/10 p-4">
              <p className="text-2xl font-semibold">11</p>
              <p className="mt-1 text-white/66">zones</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/10 p-4">
              <p className="text-2xl font-semibold">10</p>
              <p className="mt-1 text-white/66">industries</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col justify-center px-6 py-8 sm:px-10 lg:px-12">
          <header className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-2xl text-on-primary">
                <Icon name="business_center" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-primary">
                  B4BC Connect
                </h1>
                <p className="text-sm text-secondary">Business Directory</p>
              </div>
            </div>
          </header>

          <div className="mb-7">
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface">
              {title}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">{subtitle}</p>
          </div>

          {children}

          <footer className="mt-8 border-t border-outline-variant pt-5 text-center text-sm text-on-surface-variant">
            {footer}
          </footer>
        </div>
      </section>

      <footer className="absolute bottom-5 left-0 right-0 text-center text-xs text-outline">
        <p>© {new Date().getFullYear()} B4BC Connect Business Directory.</p>
      </footer>
    </main>
  );
}
