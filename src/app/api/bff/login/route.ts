import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError } from "@/lib/api/server";

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Username and password are required." },
      { status: 400 }
    );
  }
  try {
    const user = await api.login(
      parsed.data.username.trim(),
      parsed.data.password
    );
    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json(
      { message: "Login failed. Try again." },
      { status: 500 }
    );
  }
}
