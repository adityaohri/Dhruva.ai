import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DiscoverySection } from "../dashboard/discovery-section";

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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#3C2A6A]">
                Profile Intelligence Workspace
              </h1>
              <p className="mt-1 text-sm text-[rgba(60,42,106,0.75)]">
                Upload your CV once via onboarding, then use the Discovery Engine to see
                how your trajectory lines up with real-world success patterns for any
                target role or firm.
              </p>
            </div>
            {safeName !== "there" && (
              <div className="hidden text-right text-xs text-[rgba(60,42,106,0.75)] sm:block">
                <p className="font-medium">{safeName}</p>
              </div>
            )}
          </div>

          <section className="mt-4 rounded-3xl border border-[rgba(60,42,106,0.18)] bg-white/90 px-5 py-4">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[rgba(60,42,106,0.7)]">
              HOW TO USE THIS WORKSPACE
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-[rgba(60,42,106,0.8)]">
              <li>
                We use the CV and profile information you shared during the onboarding
                chat as the base for your benchmarking.
              </li>
              <li>
                Set a target role, company, and industry in the Discovery Engine below.
              </li>
              <li>
                Study the real profiles and the gap analysis to sharpen your next career
                move.
              </li>
              <li>
                Use these insights to co-create a concrete plan with Dhruva that moves
                you closer to the roles you&apos;re targeting.
              </li>
            </ol>
          </section>
        </header>

        <DiscoverySection />
      </div>
    </div>
  );
}

