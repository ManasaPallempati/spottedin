import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://spottedin.co";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/inbox", "/orders"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
