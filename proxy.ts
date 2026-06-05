import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_NEXT_HEADER, BILLING_SESSION_COOKIE_NAME } from "@/lib/billingCookies";
import { APP_CLIENT_IP_HEADER, getClientIpFromRequest } from "@/lib/requestClientIp";

function hasSessionCookie(value: string | undefined) {
  return Boolean(value && value.includes("."));
}

function loginReturnPath(request: NextRequest): string {
  const { pathname, search } = request.nextUrl;
  return `${pathname}${search}`;
}

function withClientIpHeader(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  const clientIp = getClientIpFromRequest(request);
  if (clientIp) requestHeaders.set(APP_CLIENT_IP_HEADER, clientIp);
  return requestHeaders;
}

/** GET /api/* paths still allowed (everything else migrated to server actions). */
const GET_API_ALLOWLIST = new Set<string>([]);

/** View-users modal — client fetch for paged subscriber lists (see `fetchSubscribersModalPage`). */
const SUBSCRIBERS_MODAL_GET =
  /^\/api\/(admin|manager|reseller)\/(managers|resellers|dealers)\/[^/]+\/subscribers$/;

function isMigratedDataGet(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (GET_API_ALLOWLIST.has(pathname)) return false;
  if (SUBSCRIBERS_MODAL_GET.test(pathname)) return false;
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "GET" && isMigratedDataGet(pathname)) {
    return NextResponse.json(
      {
        ok: false,
        error: "migrated",
        message: "This GET endpoint was replaced by a server action. Use the application UI instead.",
      },
      { status: 410 },
    );
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request: { headers: withClientIpHeader(request) } });
  }

  const protectedPrefixes = ["/admin", "/manager", "/reseller", "/dealer"];
  const needsAuth = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) {
    if (pathname === "/login") {
      return NextResponse.next({ request: { headers: withClientIpHeader(request) } });
    }
    return NextResponse.next();
  }

  const returnPath = loginReturnPath(request);
  const token = request.cookies.get(BILLING_SESSION_COOKIE_NAME)?.value;

  if (pathname.startsWith("/admin")) {
    const requestHeaders = withClientIpHeader(request);
    requestHeaders.set(ADMIN_LOGIN_NEXT_HEADER, returnPath);

    if (!hasSessionCookie(token)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", returnPath);
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!hasSessionCookie(token)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", returnPath);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: withClientIpHeader(request) } });
}

export const config = {
  matcher: [
    "/api/:path*",
    "/login",
    "/admin",
    "/admin/:path*",
    "/manager",
    "/manager/:path*",
    "/reseller",
    "/reseller/:path*",
    "/dealer",
    "/dealer/:path*",
  ],
};
