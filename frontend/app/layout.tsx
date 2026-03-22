import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "AI Update",
  description: "Your personal AI learning and investment digest",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AI Update" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-bg text-primary font-sans">
        {/* Signature brand bar — 2px gradient across the top */}
        <div
          className="fixed top-0 left-0 right-0 h-[2px] z-50"
          style={{ background: "linear-gradient(90deg, #4f46e5 0%, #d97706 50%, #059669 100%)" }}
        />
        <main className="max-w-2xl mx-auto px-4 pb-28 pt-7 min-h-dvh">
          {children}
        </main>
        <Navigation />
      </body>
    </html>
  );
}
