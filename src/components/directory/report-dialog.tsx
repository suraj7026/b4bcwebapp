"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { client, ApiError } from "@/lib/api/client";

const REASONS = [
  "Inaccurate information",
  "Spam or scam",
  "Inappropriate content",
  "Duplicate listing",
  "Other",
];

export function ReportDialog({
  open,
  onClose,
  memberId,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await client.reportMember(memberId, { reason, note: note || undefined });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError)
        setError(err.body.message || "Could not submit the report.");
      else setError("Could not submit the report.");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setDone(false);
    setNote("");
    setReason(REASONS[0]);
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="check_circle" filled />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Report received</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Thanks — the B4BC moderation team will review this listing.
            </p>
            <Button className="mt-6 w-full" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Report listing</h2>
              <button
                aria-label="Close"
                onClick={close}
                className="rounded p-1 text-outline hover:bg-surface-container-low"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                >
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Optional note"
                placeholder="Add any relevant context…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {error ? (
                <p className="text-sm text-error">{error}</p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={submitting}
                  onClick={submit}
                >
                  Send report
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
