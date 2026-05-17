import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmGuard AI",
  description: "AI-powered agricultural web application",
};

import ChatBot from "@/components/ChatBot";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
