import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TelegramProvider } from "@/components/providers/TelegramProvider";
import Script from "next/script";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Калькулятор ХЕ",
  description: "Умный помощник для расчета дозы инсулина",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { Navigation } from "@/components/Navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ua" suppressHydrationWarning>
      <body className={inter.className} style={{ background: '#F8F4F0', color: '#111827' }}>
        <TelegramProvider defaultLanguage="ua">
          {children}
          <Navigation />
        </TelegramProvider>
      </body>
    </html>
  );
}
