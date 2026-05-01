import { NextResponse } from "next/server";

import { auth } from "@/auth";

const publicRoutes = ["/login"];
const adminRoutes = ["/admin/users"];

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isLoggedIn = Boolean(req.auth?.user);
  const isPublicRoute = publicRoutes.includes(path);

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/medical", req.nextUrl));
  }

  if (adminRoutes.some((route) => path.startsWith(route))) {
    if (!req.auth?.user?.isAdmin) {
      return NextResponse.redirect(new URL("/medical", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
