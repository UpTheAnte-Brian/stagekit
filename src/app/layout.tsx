import type { Metadata } from "next";
import "./globals.css";

import { AppFrame } from "@/components/web/app-frame";

export const metadata: Metadata = {
  title: "StageKit",
  description: "Inventory staging app powered by Next.js and Supabase local dev",
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
