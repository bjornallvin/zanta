import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  weight: "300 900",
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Awolve Secret Santa",
  description: "Awolve's Secret Santa. Open your link to see who you're buying for.",
};

export const viewport: Viewport = {
  themeColor: "#050d1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={satoshi.variable}>
      <body>{children}</body>
    </html>
  );
}
