import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmGuard AI",
  description: "AI-powered crop disease detection and reverse bidding treatment marketplace",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FarmGuard AI",
  },
};

import ChatBot from "@/components/ChatBot";
import PWARegister from "@/components/PWARegister";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        <PWARegister />
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
