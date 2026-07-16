import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log("Middleware triggered for path:", pathname);
  // 1. Allow public routes through immediately
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  console.log("Access Token:", accessToken);
  console.log("Refresh Token:", refreshToken);
  // 2. No session credentials found -> Redirect cleanly to login gate
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Access Token expired but Refresh Token exists -> Execute silent server-side rotation
  if (!accessToken && refreshToken) {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      // If rotation fails (revoked/expired refresh token) -> Clear session cookies and redirect
      if (!res.ok) {
        const errorResponse = NextResponse.redirect(
          new URL("/login", request.url)
        );
        errorResponse.cookies.delete("access_token");
        errorResponse.cookies.delete("refresh_token");
        return errorResponse;
      }

      const body = await res.json();
      console.log("Token rotation response status:", body);

      const payload = body.data || body;

      // Support both camelCase and snake_case properties returned by the API
      const newAccessToken = payload.accessToken || payload.access_token;
      const newRefreshToken = payload.refreshToken || payload.refresh_token;

      if (!newAccessToken || !newRefreshToken) {
        throw new Error(
          "Invalid token contract structure returned during rotation."
        );
      }
      console.log("New Access Token:", newAccessToken);
      console.log("New Refresh Token:", newRefreshToken);
      // Sync the request cookies so downstream React Server Components read the active tokens immediately
      request.cookies.set("access_token", newAccessToken);
      request.cookies.set("refresh_token", newRefreshToken);

      const response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });

      const isProduction = process.env.NODE_ENV === "production";

      // Write the new access token cookie (Set to 24 Hours to prevent Axios client-side early deletion)
      response.cookies.set("access_token", newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 60, // 24 Hours (1 Day)
        path: "/",
      });

      // Write the rotated refresh token cookie (Slides the 7-Day sliding window forward!)
      response.cookies.set("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 Days
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
  // EXCLUDE /icons/ and other static files here!
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons/).*)"],
};
