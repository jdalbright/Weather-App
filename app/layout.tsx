import type { Metadata } from "next";
import { Quicksand } from "next/font/google"; // Using our organic fonts
import "./globals.css";

const quicksand = Quicksand({ subsets: ["latin"], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Weather Vibe",
  description: "A cute, personality-driven weather app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} antialiased selection:bg-white/30`}>
        {children}
      </body>
    </html>
  );
}
