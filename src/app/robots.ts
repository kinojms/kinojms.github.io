import { baseURL } from "@/resources";

export const dynamic = "force-static";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/edit/",
      },
    ],
    sitemap: `${baseURL}/sitemap.xml`,
  };
}
