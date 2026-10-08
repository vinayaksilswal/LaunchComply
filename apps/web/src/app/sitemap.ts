import type { MetadataRoute } from "next";
import { PUBLIC_NAV } from "@/lib/public-site";
import { GUIDES } from "@/lib/guides";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "https://launch-comply-tau.vercel.app";
  const paths = [
    "/",
    ...PUBLIC_NAV.map((item) => item.href),
    "/services/cloud-operations",
    "/architecture/example",
    "/docs",
    "/about",
    "/contact",
    ...Object.keys(GUIDES).map((slug) => `/docs/${slug}`),
  ];
  return paths.map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
