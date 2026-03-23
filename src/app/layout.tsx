import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NBBC Platform",
  description: "ERP/CRM pour la gestion des clients et services NBBC",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 flex h-screen overflow-hidden`}>
        <AuthProvider>
          {isPublicPage ? (
            <main className="flex-1 overflow-y-auto h-full">
              {children}
            </main>
          ) : (
            <div className="flex h-full w-full overflow-hidden relative">
              <Sidebar />
              <main className="flex-1 overflow-y-auto h-full pt-16 lg:pt-0">
                {children}
              </main>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
