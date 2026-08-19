import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, expectedSessionToken, safeEqual } from "@/lib/auth";

/**
 * Gates every page behind the shared password. If DASHBOARD_PASSWORD is not set
 * the app locks rather than opening up — the login screen then says so, which is
 * a clearer failure than silently serving company data to anyone.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const onLoginPage = pathname === "/login";

  const expected = await expectedSessionToken();
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const signedIn = expected !== null && safeEqual(token, expected);

  if (signedIn) {
    if (onLoginPage) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (onLoginPage) return NextResponse.next();

  const login = new URL("/login", request.url);
  // Remember where they were headed so sign-in can return them there.
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
