"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOwnMemberAction } from "@/app/actions/queries";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

export default function ProfilePage() {
  const memberQ = useQuery({
    queryKey: ["own-member"],
    queryFn: () => fetchOwnMemberAction(),
  });

  const m = memberQ.data;

  return (
    <main className="mx-auto max-w-[900px] px-5 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Your B4BC member record. Read-only — contact the B4BC team to update.
        </p>
      </header>

      {memberQ.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-container-low" />
      ) : !m ? (
        <Card>
          <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
            <Icon name="info" className="mt-0.5 text-base text-outline" />
            <p>We couldn&apos;t locate a member record for your session.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-lg font-semibold">Account</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Member ID"
                  value={m.registered_id ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Zone"
                  value={m.zone_name ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Email"
                  value={m.email ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Phone"
                  value={m.phone ?? "—"}
                  disabled
                  readOnly
                />
              </div>
            </CardBody>
          </Card>

          <Card className="mt-6">
            <CardBody className="space-y-4">
              <h2 className="text-lg font-semibold">Business listing</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Company name"
                  value={m.company_name ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Contact name"
                  value={m.contact_name ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Designation"
                  value={m.designation ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Sector"
                  value={m.sector ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Industry"
                  value={m.industry_name ?? m.industry_text ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Chapter"
                  value={m.chapter_name ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="Business location"
                  value={m.business_location ?? "—"}
                  disabled
                  readOnly
                />
                <Input
                  label="City"
                  value={m.city ?? "—"}
                  disabled
                  readOnly
                />
              </div>

              {m.description || m.business_nature ? (
                <div>
                  <label className="text-sm font-medium">
                    About your business
                  </label>
                  <p className="mt-1 whitespace-pre-line rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface-variant">
                    {m.description ?? m.business_nature}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </>
      )}
    </main>
  );
}
