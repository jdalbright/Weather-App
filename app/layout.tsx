import type { Metadata } from "next";
import { Quicksand } from "next/font/google"; // Using our organic fonts
import "./globals.css";

const quicksand = Quicksand({ subsets: ["latin"], variable: '--font-sans' });
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${quicksand.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
        {children}
      </body>
    </html>
  );
}
