import type { Metadata, Viewport } from "next";
import { Quicksand, Sora } from "next/font/google"; // Using our organic fonts
import "./globals.css";
import PwaManager from "@/components/PwaManager";

const quicksand = Quicksand({ subsets: ["latin"], variable: '--font-sans' });
const sora = Sora({ subsets: ["latin"], variable: "--font-display" });
const appearanceScript = `
(() => {
  const root = document.documentElement;
  const getSystemColorMode = () => {
    if (!window.matchMedia) return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  try {
    const stored = localStorage.getItem("weather-appearance");
    const appearance = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = appearance === "system"
      ? getSystemColorMode()
      : appearance;
    root.dataset.appearance = appearance;
    root.dataset.colorMode = resolved;
    root.dataset.weatherTheme = root.dataset.weatherTheme || "theme-sun";
  } catch {
    root.dataset.appearance = "system";
    root.dataset.colorMode = getSystemColorMode();
    root.dataset.weatherTheme = "theme-sun";
  }
})();
`;

export const viewport: Viewport = {
  themeColor: "#b7e7ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Weather Vibe",
  description: "Personality-driven weather forecasts powered by AI.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Weather Vibe",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${quicksand.variable} ${sora.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
        <PwaManager />
        {children}
      </body>
    </html>
  );
}
