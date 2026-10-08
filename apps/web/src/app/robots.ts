import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "https://launch-comply-tau.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/platform-admin",
        "/partner",
        "/audit",
        "/onboarding",
        "/login",
        "/signup",
        "/verify-email",
        "/api/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
