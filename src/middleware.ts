import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Injecter le pathname dans les headers pour que les Server Components puissent le lire
    const res = NextResponse.next();
    res.headers.set("x-current-path", req.nextUrl.pathname);
    return res;
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  // Protéger toutes les routes sauf login, register, pages KYC publiques (UUID), et api/auth
  matcher: ["/((?!login|register|kyc\\/[0-9a-f-]{36}|api\\/kyc\\/(?!requests)[^/]+|api/auth|api/setup-admin|_next/static|_next/image|favicon.ico).*)"],
};
