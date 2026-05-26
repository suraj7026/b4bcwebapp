import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { TopBar } from "@/components/layout/top-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  return (
    <>
      <TopBar user={session.user} />
      <div className="flex-1 bg-surface">{children}</div>
      <footer className="border-t border-outline-variant bg-surface py-4 text-center text-xs text-outline">
        © {new Date().getFullYear()} B4BC Connect Business Directory.
      </footer>
    </>
  );
}
