import { fetchMessagesSnapshotAction } from "@/app/actions/app-queries";
import { MessagesClient } from "@/app/(app)/messages/messages-client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const snapshot = await fetchMessagesSnapshotAction(first(sp.conversation));

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-8 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-outline">
          Messages
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-on-surface">
          Member conversations
        </h1>
      </header>

      <MessagesClient initialSnapshot={snapshot} />
    </main>
  );
}
