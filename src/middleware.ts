import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    if (role === "TONTINE_CLIENT") {
      const isAllowedClientPage = pathname === "/tontines" || pathname.startsWith("/tontines/");
      const isAllowedClientApi = pathname === "/api/tontines" || pathname.startsWith("/api/tontines/");
      const isAllowedSharedApi = pathname === "/api/auth" || pathname.startsWith("/api/auth/");

      if (!isAllowedClientPage && !isAllowedClientApi && !isAllowedSharedApi) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ success: false, error: "Accès refusé." }, { status: 403 });
        }

        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = "/tontines";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Injecter le pathname dans les headers pour les Server Components (Sidebar)
    const res = NextResponse.next();
    res.headers.set("x-current-path", pathname);
    return res;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  // Protéger toutes les routes sauf login, pages KYC/Sign publiques (UUID), et api/auth
  matcher: ["/((?!login|register|privacy|delete-account|kyc\\/[0-9a-f-]{36}|sign\\/[0-9a-f-]{36}|api\\/kyc\\/(?!requests)[^/]+|api\\/signatures\\/(?!templates|requests)[^/]+|api\\/cloudinary\\/sign|api\\/notify\\/paygate|api\\/tontines\\/scheduled|api\\/auth|_next\\/static|_next\\/image|favicon\\.ico).*)"],
};
