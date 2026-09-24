import type { Metadata } from "next";
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
