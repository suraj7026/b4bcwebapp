import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError } from "@/lib/api/server";

const Address = z.object({
  line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

const Body = z.object({
  companyName: z.string().max(255).optional(),
  contactName: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  description: z.string().optional(),
  services: z.array(z.string().min(1).max(120)).max(30).optional(),
  address: Address.optional(),
});

export async function PATCH(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json(await api.patchSelf(parsed.data));
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
