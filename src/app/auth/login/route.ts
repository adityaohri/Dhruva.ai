import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Magic link (passwordless) - user receives email to sign in
  if (!password) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
    const vercelUrl = (process.env.VERCEL_URL ?? "").trim();
    const origin = appUrl
      ? appUrl.replace(/\/$/, "")
      : vercelUrl
        ? `https://${vercelUrl}`
        : new URL(request.url).origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({
      message: "Check your email for the login link.",
    });
  }

  // Email + password sign in
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
