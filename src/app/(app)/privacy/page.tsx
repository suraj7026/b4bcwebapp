"use client";

import { useState } from "react";
import { client, ApiError } from "@/lib/api/client";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/utils";

export default function PrivacyPage() {
  const [exportInfo, setExportInfo] = useState<{
    downloadUrl: string;
    expiresAt: string;
  } | null>(null);
  const [deletionInfo, setDeletionInfo] = useState<{
    status: string;
    deletionAfter: string;
  } | null>(null);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function exportData() {
    setBusy("export");
    setError(null);
    try {
      const res = await client.exportOwnData();
      setExportInfo(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.body.message ?? "Export failed."
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
      const res = await client.deleteOwnAccount();
      setDeletionInfo(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.body.message ?? "Could not schedule deletion."
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
            We'll generate a JSON export of your account and activity. The
            download link expires after an hour.
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
              <p>
                <a
                  className="text-primary underline"
                  href={exportInfo.downloadUrl}
                >
                  Download my data
                </a>
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Link expires {formatDate(exportInfo.expiresAt)}.
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="text-lg font-semibold text-error">Delete account</h2>
          <p className="text-sm text-on-surface-variant">
            Deletion is scheduled for 30 days after the request. You can sign in
            and contact support before that to cancel.
          </p>
          {deletionInfo ? (
            <div className="rounded-lg border border-error/30 bg-error-container/40 p-4 text-sm text-on-error-container">
              <p className="font-semibold">Deletion scheduled.</p>
              <p>
                Your account will be removed after{" "}
                {formatDate(deletionInfo.deletionAfter)}.
              </p>
            </div>
          ) : confirming ? (
            <div className="space-y-3 rounded-lg border border-error/30 bg-error-container/30 p-4">
              <p className="text-sm">
                This will schedule your account for deletion. Type{" "}
                <span className="font-semibold">delete</span> below and confirm.
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
