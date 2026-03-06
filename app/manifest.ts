import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weather Vibe",
    short_name: "Weather Vibe",
    description: "Personality-driven weather forecasts powered by AI.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#b7e7ff",
    theme_color: "#b7e7ff",
    categories: ["weather", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
