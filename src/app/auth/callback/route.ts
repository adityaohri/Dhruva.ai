import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function readEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().split(/\r?\n/)[0].trim();
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const successNext = `/auth/success?next=${encodeURIComponent(next)}`;
  const redirectTo = `${origin}${successNext}`;
  const errorRedirect = `${origin}/?error=auth`;

  const url = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = readEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) {
    return NextResponse.redirect(errorRedirect);
  }

  const cookieStore = await cookies();

  const isSecure = origin.startsWith("https://");
  const response = NextResponse.redirect(code ? redirectTo : errorRedirect);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            path: "/",
            secure: isSecure,
            sameSite: "lax",
          })
        );
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(errorRedirect);
}
