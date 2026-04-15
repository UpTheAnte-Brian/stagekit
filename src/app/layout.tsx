import type { Metadata } from "next";
import "./globals.css";

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
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">{children}</main>
      </body>
    </html>
  );
}
