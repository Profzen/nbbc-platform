import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import GlobalLoadingIndicator from "@/components/GlobalLoadingIndicator";
import NativeAppMode from "@/components/NativeAppMode";
import NativePageTransition from "@/components/NativePageTransition";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "NBBC Platform",
  description: "ERP/CRM pour la gestion des clients et services NBBC",
  icons: {
    icon: "/nbbcl.png",
    shortcut: "/nbbcl.png",
    apple: "/nbbcl.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-current-path") || "";
  const isPublicPage = pathname.startsWith("/login") || pathname.startsWith("/kyc/") || pathname.startsWith("/sign/") || pathname === "/privacy" || pathname === "/delete-account";

  return (
    <html lang="fr">
      <body className="antialiased bg-slate-50 flex min-h-screen overflow-x-hidden">
        <AuthProvider>
          <NativeAppMode />
          <GlobalLoadingIndicator />
          {isPublicPage ? (
            <main className="flex-1 min-w-0 overflow-y-auto min-h-[100dvh] native-main app-content min-h-0">
              <NativePageTransition>{children}</NativePageTransition>
            </main>
          ) : (
            <div className="flex h-[100dvh] w-full min-w-0 relative app-shell">
              <Sidebar />
              <main className="flex-1 min-w-0 min-h-0 overflow-y-auto pt-16 pb-20 lg:pt-0 lg:pb-0 native-main app-content">
                <NativePageTransition>{children}</NativePageTransition>
              </main>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
