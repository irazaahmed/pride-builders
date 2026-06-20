import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isCustomerRoute = nextUrl.pathname.startsWith("/customer");

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/customer/dashboard" : "/login", nextUrl)
    );
  }

  if (isCustomerRoute && role !== "CUSTOMER") {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/admin/dashboard" : "/login", nextUrl)
    );
  }
});

export const config = {
  matcher: ["/admin/:path*", "/customer/:path*"],
};
