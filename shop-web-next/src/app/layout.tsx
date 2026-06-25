import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { ConsoleErrorFilter } from "@/components/console-error-filter";
import { SnackMascot } from "@/components/fun/snack-mascot";
import { PageTransition } from "@/components/design/page-transition";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "YQSX 智能零食商城",
  description: "AI 驱动的智能购物体验 - 拍照识别零食，智能推荐商品",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <ConsoleErrorFilter />
        <PageTransition>{children}</PageTransition>
        <SnackMascot />
      </body>
    </html>
  );
}
