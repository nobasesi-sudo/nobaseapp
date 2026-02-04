import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "余剰野菜マーケット",
  description: "農家直送の新鮮な余剰野菜をお得にご購入いただけます",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
