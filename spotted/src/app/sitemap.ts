import type { MetadataRoute } from "next";

const routes = [
  "",
  "/deck",
  "/fits",
  "/irl",
  "/search",
  "/sell",
  "/inbox",
  "/checkout",
  "/closet",
  "/landing",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://spottedin.co";
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "hourly" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
