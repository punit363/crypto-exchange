import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip system routing and icon assets
  if (
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Allow public gates
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // 3. No session credentials found -> Redirect to login
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Access Token expired but Refresh Token is alive -> Rotate session
  if (!accessToken && refreshToken) {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      // Handle failed refresh (invalid or expired refresh token)
      if (!res.ok) {
        const errorResponse = NextResponse.redirect(
          new URL("/login", request.url)
        );
        errorResponse.cookies.delete("access_token");
        errorResponse.cookies.delete("refresh_token");
        return errorResponse;
      }

      const body = await res.json();
      const payload = body.data || body;
      const newAccessToken = payload.accessToken || payload.access_token;
      const newRefreshToken = payload.refreshToken || payload.refresh_token;

      if (!newAccessToken || !newRefreshToken) {
        throw new Error("Invalid token structure returned from Auth server.");
      }

      const response = NextResponse.next();

      // Write access_token with httpOnly: false so client-side Axios can read it
      response.cookies.set("access_token", newAccessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      // Write refresh_token with httpOnly: true to keep it safe from XSS
      response.cookies.set("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return response;
    } catch (error) {
      console.error("Middleware token rotation failure:", error);
      const errResponse = NextResponse.redirect(new URL("/login", request.url));
      errResponse.cookies.delete("access_token");
      errResponse.cookies.delete("refresh_token");
      return errResponse;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons/.*).*)"],
};