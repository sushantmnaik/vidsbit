import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vidsbit.app";

const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    {
      path: "/",
      changeFrequency: "weekly" as const,
      priority: 1,
    },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
