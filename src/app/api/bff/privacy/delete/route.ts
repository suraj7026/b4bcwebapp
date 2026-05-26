import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/server";

export async function DELETE() {
  try {
    return NextResponse.json(await api.deleteOwnAccount(), { status: 202 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
