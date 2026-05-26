"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { fetchOwnMember } from "@/lib/supabase-queries";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import type { Member } from "@/types/database";

type EditableMember = Pick<
  Member,
  | "company_name"
  | "contact_name"
  | "email"
  | "phone"
  | "description"
  | "services"
  | "city"
  | "state"
  | "address_line1"
>;

const empty: EditableMember = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  description: "",
  services: [],
  city: "",
  state: "",
  address_line1: "",
};

export default function ProfilePage() {
  const sb = useMemo(() => createClient(), []);
  const qc = useQueryClient();

  const userQ = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await sb.auth.getUser()).data.user,
  });
  const userId = userQ.data?.id ?? null;
  const role =
    (userQ.data?.app_metadata as { role?: string } | undefined)?.role ??
    "member";

  const memberQ = useQuery({
    queryKey: ["own-member", userId],
    queryFn: () => (userId ? fetchOwnMember(sb, userId) : null),
    enabled: !!userId,
  });

  const [form, setForm] = useState<EditableMember>(empty);
  const [services, setServices] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (memberQ.data) {
      setForm({
        company_name: memberQ.data.company_name ?? "",
        contact_name: memberQ.data.contact_name ?? "",
        email: memberQ.data.email ?? "",
        phone: memberQ.data.phone ?? "",
        description: memberQ.data.description ?? "",
        services: memberQ.data.services ?? [],
        city: memberQ.data.city ?? "",
        state: memberQ.data.state ?? "",
        address_line1: memberQ.data.address_line1 ?? "",
      });
      setServices((memberQ.data.services ?? []).join(", "));
    }
  }, [memberQ.data]);

  const save = useMutation({
    mutationFn: async (payload: EditableMember) => {
      if (!memberQ.data) throw new Error("No member row to update");
      const { error: e } = await sb
        .from("members")
        .update(payload)
        .eq("id", memberQ.data.id);
      if (e) throw e;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["own-member", userId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not save changes.";
      setError(message);
    },
  });

  const isMember = role === "member" && !!memberQ.data;

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
              label="Email"
              value={userQ.data?.email ?? ""}
              disabled
              readOnly
            />
            <Input label="Role" value={role} disabled readOnly />
            <Input
              label="Zone"
              value={
                (userQ.data?.app_metadata as { zone?: string } | undefined)
                  ?.zone ?? "—"
              }
              disabled
              readOnly
            />
            <Input
              label="User ID"
              value={userQ.data?.id ?? ""}
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
                value={form.company_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, company_name: e.target.value })
                }
              />
              <Input
                label="Contact name"
                value={form.contact_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contact_name: e.target.value })
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
                value={form.address_line1 ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address_line1: e.target.value })
                }
              />
              <Input
                label="City"
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label="State"
                value={form.state ?? ""}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>

            {error ? <p className="text-sm text-error">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (memberQ.data) {
                    setForm({
                      company_name: memberQ.data.company_name ?? "",
                      contact_name: memberQ.data.contact_name ?? "",
                      email: memberQ.data.email ?? "",
                      phone: memberQ.data.phone ?? "",
                      description: memberQ.data.description ?? "",
                      services: memberQ.data.services ?? [],
                      city: memberQ.data.city ?? "",
                      state: memberQ.data.state ?? "",
                      address_line1: memberQ.data.address_line1 ?? "",
                    });
                    setServices((memberQ.data.services ?? []).join(", "));
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
                      : [],
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
              You're signed in as a {role.replace("_", " ")}. Member listings
              can only be edited by the owning member account.
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
