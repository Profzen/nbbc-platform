import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 flex h-screen overflow-hidden`}>
        <AuthProvider>
          <div className="flex h-full w-full overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 overflow-y-auto h-full pt-16 lg:pt-0">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
