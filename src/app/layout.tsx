import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import GlobalLoadingIndicator from "@/components/GlobalLoadingIndicator";
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-current-path") || "";
  const isPublicPage = pathname.startsWith("/login") || pathname.startsWith("/kyc/") || pathname.startsWith("/sign/");

  return (
    <html lang="fr">
      <body className="antialiased bg-slate-50 flex min-h-screen md:h-screen overflow-x-hidden md:overflow-hidden">
        <AuthProvider>
          <GlobalLoadingIndicator />
          {isPublicPage ? (
            <main className="flex-1 min-w-0 overflow-y-auto h-full">
              {children}
            </main>
          ) : (
            <div className="flex h-full w-full min-w-0 overflow-hidden relative">
              <Sidebar />
              <main className="flex-1 min-w-0 overflow-y-auto h-full pt-16 lg:pt-0">
                {children}
              </main>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
