import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar user={user} />
      <div className="flex-1 bg-surface">{children}</div>
      <footer className="border-t border-outline-variant bg-surface py-4 text-center text-xs text-outline">
        © {new Date().getFullYear()} B4BC Connect Business Directory.
      </footer>
    </>
  );
}
