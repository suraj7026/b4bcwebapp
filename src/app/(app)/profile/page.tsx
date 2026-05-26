"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client, ApiError } from "@/lib/api/client";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import type { MemberPatchPayload } from "@/lib/api/types";

export default function ProfilePage() {
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => client.me() });
  const memberId = meQ.data?.memberId;

  const memberQ = useQuery({
    enabled: !!memberId,
    queryKey: ["members", memberId],
    queryFn: () => client.member(memberId as string),
  });

  const [form, setForm] = useState<MemberPatchPayload>({});
  const [services, setServices] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (memberQ.data) {
      setForm({
        companyName: memberQ.data.companyName ?? "",
        contactName: memberQ.data.contactName ?? "",
        email: memberQ.data.email ?? "",
        phone: memberQ.data.phone ?? "",
        description: memberQ.data.description ?? "",
        address: {
          line1: memberQ.data.address.line1,
          city: memberQ.data.address.city,
          state: memberQ.data.address.state,
        },
      });
      setServices(memberQ.data.services.join(", "));
    }
  }, [memberQ.data]);

  const save = useMutation({
    mutationFn: (payload: MemberPatchPayload) => client.patchSelf(payload),
    onSuccess: (data) => {
      qc.setQueryData(["members", memberId], data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => {
      if (err instanceof ApiError)
        setError(err.body.message || "Could not save changes.");
      else setError("Could not save changes.");
    },
  });

  const isMember = meQ.data?.role === "member" && !!memberId;

  return (
    <main className="mx-auto max-w-[900px] px-5 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Manage your account and business listing.
        </p>
      </header>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-lg font-semibold">Account</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Username"
              value={meQ.data?.username ?? ""}
              disabled
              readOnly
            />
            <Input
              label="Display name"
              value={meQ.data?.displayName ?? ""}
              disabled
              readOnly
            />
            <Input
              label="Role"
              value={meQ.data?.role ?? ""}
              disabled
              readOnly
            />
            <Input
              label="Zone"
              value={meQ.data?.zone ?? "—"}
              disabled
              readOnly
            />
          </div>
        </CardBody>
      </Card>

      {isMember ? (
        <Card className="mt-6">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Business listing</h2>
              {saved ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Icon name="check_circle" filled className="text-base" />
                  Saved
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Company name"
                value={form.companyName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
              />
              <Input
                label="Contact name"
                value={form.contactName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
              />
              <Input
                label="Email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">About your business</label>
              <textarea
                rows={4}
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <Input
              label="Services (comma-separated)"
              value={services}
              onChange={(e) => setServices(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Address"
                value={form.address?.line1 ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...form.address, line1: e.target.value },
                  })
                }
              />
              <Input
                label="City"
                value={form.address?.city ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...form.address, city: e.target.value },
                  })
                }
              />
              <Input
                label="State"
                value={form.address?.state ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...form.address, state: e.target.value },
                  })
                }
              />
            </div>

            {error ? <p className="text-sm text-error">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (memberQ.data) {
                    setForm({
                      companyName: memberQ.data.companyName ?? "",
                      contactName: memberQ.data.contactName ?? "",
                      email: memberQ.data.email ?? "",
                      phone: memberQ.data.phone ?? "",
                      description: memberQ.data.description ?? "",
                      address: {
                        line1: memberQ.data.address.line1,
                        city: memberQ.data.address.city,
                        state: memberQ.data.address.state,
                      },
                    });
                    setServices(memberQ.data.services.join(", "));
                  }
                }}
              >
                Reset
              </Button>
              <Button
                loading={save.isPending}
                onClick={() => {
                  setError(null);
                  save.mutate({
                    ...form,
                    services: services
                      ? services
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : undefined,
                  });
                }}
              >
                Save changes
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardBody className="text-sm text-on-surface-variant">
            <p>
              You're signed in as a {meQ.data?.role.replace("_", " ")}. Member
              listings can only be edited by the owning member account.
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
