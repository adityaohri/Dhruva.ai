import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatClient } from "./ChatClient";

export const runtime = "nodejs";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profileRow?.onboarding_complete) {
    redirect("/onboard");
  }

  return <ChatClient />;
}

