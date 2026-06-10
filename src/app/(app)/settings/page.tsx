import { fetchMemberSettingsSnapshotAction } from "@/app/actions/app-queries";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, settings] = await Promise.all([
    getSessionUser(),
    fetchMemberSettingsSnapshotAction(),
  ]);

  return (
    <main className="mx-auto max-w-[980px] px-5 py-8 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-outline">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-on-surface">
          Business profile settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
          Manage how your business profile and member activity appear across
          B4BC Connect.
        </p>
      </header>

      <div className="grid gap-5">
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-on-primary">
                  {user?.displayName?.[0]?.toUpperCase() ?? "B"}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {user?.displayName ?? "B4BC Member"}
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    {user?.email ?? "Member email unavailable"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Icon name="account_circle" />
                View Profile
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold">Profile completeness</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Keep your profile complete so partners can understand what you
              offer.
            </p>
            {settings.profileCompletion == null ? (
              <p className="mt-5 rounded-lg border border-border-subtle bg-surface-container-low p-4 text-sm text-on-surface-variant">
                No app profile settings have been saved yet.
              </p>
            ) : (
              <>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${settings.profileCompletion}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-medium text-on-surface-variant">
                  {settings.profileCompletion}% complete
                </p>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <div className="mt-4 space-y-3">
              {settings.notificationOptions.length === 0 ? (
                <p className="rounded-lg border border-border-subtle bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  No notification preferences have been saved yet.
                </p>
              ) : null}

              {settings.notificationOptions.map((item) => (
                <label
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface-container-low p-4"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <input
                    type="checkbox"
                    defaultChecked={item.enabled}
                    className="size-5 rounded border-border-subtle text-primary focus:ring-primary"
                  />
                </label>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
