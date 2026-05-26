"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/utils";

export default function PrivacyPage() {
  const sb = useMemo(() => createClient(), []);
  const [exportInfo, setExportInfo] = useState<{
    download_url: string | null;
    expires_at: string | null;
  } | null>(null);
  const [deletionInfo, setDeletionInfo] = useState<{
    status: string;
    deletion_after: string;
  } | null>(null);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function exportData() {
    setBusy("export");
    setError(null);
    try {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { data, error: e } = await sb
        .from("user_exports")
        .insert({
          user_id: u.user.id,
          download_url: null,
          expires_at: expiresAt,
        })
        .select()
        .single();
      if (e) throw e;
      setExportInfo({
        download_url: data.download_url,
        expires_at: data.expires_at,
      });
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Export failed."
      );
    } finally {
      setBusy(null);
    }
  }

  async function requestDeletion() {
    setBusy("delete");
    setError(null);
    try {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const deletionAfter = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { data, error: e } = await sb
        .from("user_deletion_requests")
        .upsert({
          user_id: u.user.id,
          deletion_after: deletionAfter,
          status: "scheduled",
        })
        .select()
        .single();
      if (e) throw e;
      setDeletionInfo({
        status: data.status,
        deletion_after: data.deletion_after,
      });
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not schedule deletion."
      );
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  }

  return (
    <main className="mx-auto max-w-[900px] px-5 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Privacy</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Export your data or schedule account deletion.
        </p>
      </header>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="text-lg font-semibold">Export your data</h2>
          <p className="text-sm text-on-surface-variant">
            We'll queue a JSON export of your account and activity. The
            download link will be emailed when ready and expires in an hour.
          </p>
          <div>
            <Button
              variant="outline"
              loading={busy === "export"}
              onClick={exportData}
            >
              <Icon name="download" className="text-base" />
              Request export
            </Button>
          </div>
          {exportInfo ? (
            <div className="mt-2 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm">
              <p>Export queued.</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Link will be valid until {formatDate(exportInfo.expires_at)}.
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="text-lg font-semibold text-error">Delete account</h2>
          <p className="text-sm text-on-surface-variant">
            Deletion is scheduled for 30 days after the request. You can sign
            in and contact support before that to cancel.
          </p>
          {deletionInfo ? (
            <div className="rounded-lg border border-error/30 bg-error-container/40 p-4 text-sm text-on-error-container">
              <p className="font-semibold">Deletion scheduled.</p>
              <p>
                Your account will be removed after{" "}
                {formatDate(deletionInfo.deletion_after)}.
              </p>
            </div>
          ) : confirming ? (
            <div className="space-y-3 rounded-lg border border-error/30 bg-error-container/30 p-4">
              <p className="text-sm">
                This will schedule your account for deletion.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={busy === "delete"}
                  onClick={requestDeletion}
                >
                  Confirm deletion
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button variant="danger" onClick={() => setConfirming(true)}>
                <Icon name="delete" className="text-base" />
                Schedule deletion
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {error ? <p className="text-sm text-error">{error}</p> : null}
    </main>
  );
}
