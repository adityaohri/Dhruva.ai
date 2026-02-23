import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function readEnv(value: string | undefined): string {
  if (!value) return "";
  return value.trim().split(/\r?\n/)[0].trim();
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const redirectTo = `${origin}${next}`;
  const errorRedirect = `${origin}/?error=auth`;

  const response = NextResponse.redirect(code ? redirectTo : errorRedirect);

  const url = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = readEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) {
    return NextResponse.redirect(errorRedirect);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
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
