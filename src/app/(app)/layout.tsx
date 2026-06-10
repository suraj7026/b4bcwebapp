import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";

const EMPTY_ACTIVITY_COUNTS = {
  unreadNotifications: 0,
  unreadMessages: 0,
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <TopBar user={user} activityCounts={EMPTY_ACTIVITY_COUNTS} />
      <div className="flex-1 bg-background pb-20 lg:ml-[280px] lg:pb-0 lg:pt-16">
        {children}
      </div>
    </>
  );
}
