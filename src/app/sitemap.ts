import { baseURL, routes as routesConfig } from "@/resources";
import { loadProjects } from "@/lib/content/load";

export const dynamic = "force-static";

// The editor (/edit) is deliberately left out.
const HIDDEN = ["/edit"];

export default async function sitemap() {
  const works = loadProjects().map((project) => ({
    url: `${baseURL}/work/${project.slug}`,
    lastModified: project.publishedAt,
  }));

  const activeRoutes = Object.keys(routesConfig).filter(
    (route) => routesConfig[route as keyof typeof routesConfig] && !HIDDEN.includes(route),
  );

  const routes = activeRoutes.map((route) => ({
    url: `${baseURL}${route !== "/" ? route : ""}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [...routes, ...works];
}
