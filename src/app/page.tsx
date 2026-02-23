import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Missing Supabase env") || message.includes("NEXT_PUBLIC_SUPABASE")) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
          <main className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
            <h1 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
              Configuration needed
            </h1>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Add your Supabase and OpenAI keys in Vercel so the app can run.
            </p>
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Vercel → Your Project → Settings → Environment Variables. Add:
              <br />
              <code className="mt-1 block rounded bg-amber-100 px-2 py-1 dark:bg-amber-900">
                NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY
              </code>
            </p>
          </main>
        </div>
      );
    }
    throw err;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-10 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome
          </h1>
          <p className="text-muted-foreground">
            Sign in to continue to your dashboard.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Login with Email</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login?provider=google">Login with Google</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
