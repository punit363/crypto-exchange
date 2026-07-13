import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!accessToken && refreshToken) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        const errorResponse = NextResponse.redirect(new URL("/login", request.url));
        errorResponse.cookies.delete("access_token");
        errorResponse.cookies.delete("refresh_token");
        return errorResponse;
      }

      const body = await res.json();
      const newAccessToken = body.data?.accessToken || body.accessToken;

      request.cookies.set("access_token", newAccessToken);

      const response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });

      response.cookies.set("access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 15, 
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
