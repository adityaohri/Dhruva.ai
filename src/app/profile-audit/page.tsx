import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileAuditSectionsClient } from "./ProfileAuditSectionsClient";

export const runtime = "nodejs";

type UserProfile = {
  id: string;
  full_name: string | null;
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
    .select("id, full_name, onboarding_complete")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  if (!profileRow?.onboarding_complete) {
    // Ensure users complete onboarding first, starting from Home -> Get Started.
    redirect("/");
  }

  const safeName =
    profileRow.full_name && profileRow.full_name.trim().length > 0
      ? profileRow.full_name.trim()
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
            </div>
            {safeName !== "there" && (
              <div className="hidden text-right text-xs text-[rgba(60,42,106,0.75)] sm:block">
                <p className="font-medium">{safeName}</p>
              </div>
            )}
          </div>
        </header>

        <ProfileAuditSectionsClient />
      </div>
    </div>
  );
}

