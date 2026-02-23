"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function RedirectContent() {
  const searchParams = useSearchParams();
  const [done, setDone] = useState(false);
  const next = searchParams.get("next") ?? "/dashboard";

  useEffect(() => {
    setDone(true);
  }, []);

  useEffect(() => {
    if (!done) return;
    const target = next.startsWith("/") ? next : `/${next}`;
    window.location.replace(target);
  }, [done, next]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-muted-foreground">Sign-in successful. Taking you to the dashboard…</p>
        <p className="mt-3 text-sm text-muted-foreground">
          <a href={next.startsWith("/") ? next : `/${next}`} className="text-primary underline">
            Click here if you’re not redirected
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
          <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
            <p className="text-muted-foreground">Loading…</p>
          </div>
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
