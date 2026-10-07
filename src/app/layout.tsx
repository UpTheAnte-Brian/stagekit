import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

import { AppFrame } from "@/components/web/app-frame";

export const metadata: Metadata = {
  title: {
    default: "AJ Home Staging | Staging Matters",
    template: "%s | AJ Home Staging",
  },
  description: "Thoughtful home staging that helps buyers see what is possible.",
  icons: {
    icon: [
      { url: "/aj-home-favicon.png?v=1", type: "image/png", sizes: "128x128" },
    ],
    shortcut: ["/aj-home-favicon.png?v=1"],
    apple: [{ url: "/aj-home-favicon.png?v=1", sizes: "128x128", type: "image/png" }],
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
        <Suspense fallback={<main className="min-h-screen bg-[#f8f6f1]" />}>
          <AppFrame>{children}</AppFrame>
        </Suspense>
      </body>
    </html>
  );
}
