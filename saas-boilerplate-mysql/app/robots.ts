import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api"],
      },
      // AI search/retrieval crawlers — these power citations in ChatGPT
      // Search, Claude, and Perplexity answers. Allowed by default so
      // the product is discoverable; same disallow list as above.
      {
        userAgent: ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "ChatGPT-User", "Claude-User"],
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api"],
      },
      // AI training crawlers — these feed model training datasets, a
      // separate decision from search visibility. Left allowed here;
      // switch to `disallow: "/"` per bot below if you'd rather opt
      // your content out of training data.
      {
        userAgent: ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot"],
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
