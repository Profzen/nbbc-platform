import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // Injecter le pathname dans les headers pour les Server Components (Sidebar)
    const res = NextResponse.next();
    res.headers.set("x-current-path", pathname);
    return res;
  },
  {
    callbacks: {
      // Tout utilisateur connecté a accès à tout (séparation par rôle à faire plus tard)
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  // Protéger toutes les routes sauf login, pages KYC/Sign publiques (UUID), et api/auth
  matcher: ["/((?!login|kyc\\/[0-9a-f-]{36}|sign\\/[0-9a-f-]{36}|api\\/kyc\\/(?!requests)[^/]+|api\\/signatures\\/(?!templates|requests)[^/]+|api\\/cloudinary\\/sign|api\\/auth|api\\/setup-admin|_next\\/static|_next\\/image|favicon\\.ico).*)"],
};
