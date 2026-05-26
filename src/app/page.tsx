import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";

export default async function Index() {
  const session = await readSession();
  redirect(session ? "/directory" : "/login");
}
