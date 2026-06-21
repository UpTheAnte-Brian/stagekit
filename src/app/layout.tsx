import type { Metadata } from "next";
import "./globals.css";

import { AppFrame } from "@/components/web/app-frame";

export const metadata: Metadata = {
  title: "StageKit",
  description: "Inventory staging app powered by Next.js and Supabase local dev",
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    shortcut: ["/favicon.ico?v=2"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
