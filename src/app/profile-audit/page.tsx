import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CvAndDiscoverySection } from "../dashboard/cv-and-discovery";

export const runtime = "nodejs";

type UserProfile = {
  user_id: string;
  name: string | null;
  onboarding_complete: boolean | null;
};

export default async function ProfileAuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("user_id, name, onboarding_complete")
    .eq("user_id", user.id)
    .maybeSingle<UserProfile>();

  if (!profileRow?.onboarding_complete) {
    // Ensure users complete onboarding first, starting from Home -> Get Started.
    redirect("/");
  }

  const safeName =
    profileRow.name && profileRow.name.trim().length > 0
      ? profileRow.name.trim()
      : "there";

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#FDFBF1] px-4 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl font-semibold text-[#3C2A6A]">
            Profile Audit
          </h1>
          <p className="text-sm text-[rgba(60,42,106,0.75)]">
            Hi {safeName}, upload your CV, lock in your target role and company,
            and run a benchmarking gap analysis against real-world trajectories.
          </p>
        </header>

        <CvAndDiscoverySection />
      </div>
    </div>
  );
}

