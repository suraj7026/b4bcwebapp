import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Index() {
  const session = await readSession();
  redirect(session ? "/directory" : "/login");
}
