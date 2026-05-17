import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  viewport: "width=device-width, initial-scale=1",
  // other metadata fields

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
      <body className="antialiased selection:bg-emerald-500/20 selection:text-emerald-400 overflow-x-hidden">
        <PWARegister />
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
