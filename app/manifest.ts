import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Madhav Labels",
    short_name: "Labels",
    description: "WebUSB thermal label printer for Madhav Departmental Store",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "en",
    categories: ["shopping", "productivity", "utilities"],
    icons: [
      { src: "/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
