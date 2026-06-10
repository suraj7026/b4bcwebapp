"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  fetchMessagesSnapshotAction,
  sendChatMessageAction,
  type MessagesSnapshot,
} from "@/app/actions/app-queries";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function MessagesClient({
  initialSnapshot,
}: {
  initialSnapshot: MessagesSnapshot;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [snapshot.thread.length, snapshot.activeConversationId]);

  const loadConversation = (conversationId: string) => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const next = await fetchMessagesSnapshotAction(conversationId);
        setSnapshot(next);
        router.replace(`/messages?conversation=${conversationId}`, {
          scroll: false,
        });
      })();
    });
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot.activeConversationId) return;

    const body = message.trim();
    if (!body) return;
    setError(null);

    startTransition(() => {
      void (async () => {
        const result = await sendChatMessageAction({
          conversationId: snapshot.activeConversationId!,
          body,
        });

        if (!result.ok || !result.snapshot) {
          setError(result.error ?? "Unable to send message.");
          return;
        }

        setSnapshot(result.snapshot);
        setMessage("");
      })();
    });
  };

  return (
    <section className="grid min-h-[680px] overflow-hidden rounded-xl border border-border-subtle bg-surface-container-lowest shadow-card lg:grid-cols-[360px_1fr]">
      <aside className="border-b border-border-subtle lg:border-b-0 lg:border-r">
        <div className="border-b border-border-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Recent Chats</h2>
            <Button variant="ghost" size="sm" aria-label="New message">
              <Icon name="add" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2">
            <Icon name="search" className="text-on-surface-variant" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search conversations..."
            />
          </div>
        </div>

        <div className="divide-y divide-border-subtle">
          {snapshot.conversations.length === 0 ? (
            <div className="p-4 text-sm text-on-surface-variant">
              No conversations yet. Open a member profile and start a chat.
            </div>
          ) : null}

          {snapshot.conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => loadConversation(conversation.id)}
              disabled={isPending}
              className={cn(
                "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-container-low disabled:cursor-wait",
                conversation.active && "bg-primary-fixed/70"
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                {conversation.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">
                    {conversation.name}
                  </p>
                  <span className="text-xs text-on-surface-variant">
                    {conversation.time}
                  </span>
                </div>
                <p className="truncate text-xs text-on-surface-variant">
                  {conversation.preview}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-[560px] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle p-4">
          <div>
            <p className="font-semibold">
              {snapshot.activeName ?? "No conversation selected"}
            </p>
            {snapshot.activeSubtitle ? (
              <p className="text-xs text-on-surface-variant">
                {snapshot.activeSubtitle}
              </p>
            ) : null}
          </div>
          <div className="flex gap-1 text-primary">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Call"
              disabled={!snapshot.activeConversationId}
            >
              <Icon name="call" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Video call"
              disabled={!snapshot.activeConversationId}
            >
              <Icon name="videocam" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Info"
              disabled={!snapshot.activeConversationId}
            >
              <Icon name="info" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-surface p-5">
          {snapshot.thread.length === 0 ? (
            <p className="text-center text-sm text-on-surface-variant">
              {snapshot.activeConversationId
                ? "No messages yet."
                : "Select a conversation to start messaging."}
            </p>
          ) : null}

          {snapshot.thread.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex",
                item.side === "right" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[72%] rounded-xl px-4 py-3 text-sm leading-6 shadow-card",
                  item.side === "right"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-lowest text-on-surface"
                )}
              >
                <p>{item.text}</p>
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    item.side === "right"
                      ? "text-on-primary/75"
                      : "text-on-surface-variant"
                  )}
                >
                  {item.time}
                </p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={sendMessage}
          className="flex items-center gap-2 border-t border-border-subtle p-4"
        >
          <Button
            variant="ghost"
            size="sm"
            aria-label="Add file"
            disabled={!snapshot.activeConversationId || isPending}
          >
            <Icon name="add" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Add image"
            disabled={!snapshot.activeConversationId || isPending}
          >
            <Icon name="image" />
          </Button>
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={!snapshot.activeConversationId || isPending}
            className="h-11 flex-1 rounded-lg border border-border-subtle bg-surface-container-low px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={
              snapshot.activeConversationId
                ? "Write a message..."
                : "Start a conversation from a member profile"
            }
          />
          <Button
            type="submit"
            aria-label="Send message"
            loading={isPending}
            disabled={!snapshot.activeConversationId || !message.trim()}
          >
            <Icon name="send" />
          </Button>
        </form>
        {error ? (
          <p className="border-t border-border-subtle px-4 py-3 text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
      </section>
    </section>
  );
}
