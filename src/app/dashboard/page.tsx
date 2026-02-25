import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CvAndDiscoverySection } from "./cv-and-discovery";

export const runtime = "nodejs";

/** Allow CV analysis (PDF + OpenAI) to run up to 60s so the server action does not time out. */
export const maxDuration = 60;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4 rounded-3xl border border-[#E5E7EB] bg-[#FDFBF1] px-8 py-6 text-card-foreground">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#3C2A6A]">
              Profile Intelligence Workspace
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-700">
              Upload your CV once, then use the Discovery Engine to see how
              your trajectory lines up with real-world success patterns for any
              target role or firm.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <span className="text-xs text-slate-500">{user.email}</span>
            <form action="/auth/signout" method="POST">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="rounded-full border border-[#3C2A6A]/20 bg-white/60 px-4 py-1 text-xs font-medium text-[#3C2A6A] hover:bg-[#3C2A6A] hover:text-[#FDFBF1]"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white/60 px-5 py-4 text-xs text-slate-700">
          <h3 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-[#3C2A6A]">
            How to use this workspace
          </h3>
          <ol className="mt-3 space-y-1.5 list-decimal list-inside">
            <li>Upload your latest CV and save the parsed profile.</li>
            <li>Set a target role and company in the Discovery Engine.</li>
            <li>
              Study the real profiles and the gap analysis to sharpen your next
              career move.
            </li>
          </ol>
        </div>
      </div>

      <div className="rounded-3xl border border-[#E5E7EB] bg-[#FDFBF1] p-6">
        <CvAndDiscoverySection />
      </div>
    </div>
  );
}
