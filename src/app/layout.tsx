import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "بحث السيارات ✨ — محرك بحث شخصي لرباب",
  description:
    "محرك بحث ذكي للسيارات في السعودية. ابحثي عن سيارتك المثالية بالمواصفات والسعر واللون الذي تريدينه.",
  keywords: ["سيارات", "بحث سيارات", "حراج", "السعودية", "سيارة", "رباب"],
  openGraph: {
    locale: "ar_SA",
    title: "بحث السيارات ✨",
    description: "محرك بحث ذكي للسيارات في السعودية",
  },
};

export const viewport: Viewport = {
  themeColor: "#c4717a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} antialiased`}>{children}</body>
    </html>
  );
}
