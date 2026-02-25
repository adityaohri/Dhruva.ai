import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16">
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <div className="space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#3C2A6A]/5">
            <Image
              src="/dhruva-logo.png"
              alt="dhruva.ai logo"
              width={48}
              height={48}
              className="h-12 w-12"
            />
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#3C2A6A]">
              The AI layer for
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#3C2A6A] sm:text-4xl">
              early career clarity
            </h1>
            <p className="mx-auto max-w-xl text-sm text-slate-700">
              Turn your CV and target roles into a living intelligence workspace
              that surfaces real trajectories, gaps, and next moves.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-[#3C2A6A] px-8 text-sm font-medium text-[#FDFBF1] hover:bg-[#4a347f]"
          >
            <Link href="/login">Get started</Link>
          </Button>
          <span className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#3C2A6A] underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </span>
        </div>
      </main>
    </div>
  );
}
