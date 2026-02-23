import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CvUploadSection } from "./cv-upload-section";

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <h1 className="font-semibold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <form action="/auth/signout" method="POST">
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="text-lg font-medium">Welcome back</h2>
          <p className="mt-1 text-muted-foreground">
            You're signed in. Upload a resume below to extract your profile with AI.
          </p>
          <Button asChild className="mt-4">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
        <CvUploadSection />
      </main>
    </div>
  );
}
