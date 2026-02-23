import Link from "next/link";
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
