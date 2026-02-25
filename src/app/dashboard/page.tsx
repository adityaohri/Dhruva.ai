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
    <div className="min-h-screen bg-[#FDFBF1] text-slate-900">
      <header className="border-b border-[#3C2A6A]/8 bg-[#FDFBF1]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <h1 className="font-serif text-xl font-semibold text-[#3C2A6A] tracking-tight">
            dhruva.ai
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {user.email}
            </span>
            <form action="/auth/signout" method="POST">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="rounded-full border border-transparent bg-transparent px-4 py-1 text-xs font-medium text-[#3C2A6A] hover:border-[#3C2A6A]/20 hover:bg-[#3C2A6A]/5"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        <div className="rounded-3xl border border-[#3C2A6A]/10 bg-[#FDFBF1]/80 px-8 py-6 text-card-foreground">
          <h2 className="font-serif text-2xl font-semibold text-[#3C2A6A]">
            Profile Intelligence Workspace
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            Upload your CV once, then use the Discovery Engine to see how your trajectory
            lines up with real-world success patterns for any target role or firm.
          </p>
          <Button
            asChild
            className="mt-4 rounded-full bg-[#3C2A6A] px-5 py-2 text-xs font-medium text-[#FDFBF1] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#4a347f]"
          >
            <Link href="/">Back to home</Link>
          </Button>
        </div>

        <CvAndDiscoverySection />
      </main>
    </div>
  );
}
