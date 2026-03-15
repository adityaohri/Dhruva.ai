"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingChat } from "@/components/OnboardingChat";

export default function OnboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: row } = await supabase
        .from("user_profiles")
        .select("onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row?.onboarding_complete) {
        router.replace("/dashboard");
        return;
      }
      setUserId(user.id);
      setReady(true);
    };
    check();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdfbf1]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3c2a6a] border-t-transparent" />
      </div>
    );
  }

  return userId ? <OnboardingChat userId={userId} /> : null;
}
