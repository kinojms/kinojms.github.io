import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutProvider } from "@once-ui-system/core/next";
import { IconProvider } from "@once-ui-system/core";
import { iconLibrary } from "@/resources/icons";
import { describe, expect, it } from "vitest";
import { HomeView } from "./HomeView";
import type { HomeContent, Project } from "@/lib/content/format";

const home: HomeContent = {
  title: "Home",
  description: "Description",
  headline: "The lights in the sky are stars",
  subline: "Hello",
  featured: { display: false, title: "", href: "" },
};

const projects: Project[] = Array.from({ length: 7 }, (_, i) => ({
  slug: `project-${i + 1}`,
  title: `Project ${i + 1}`,
  publishedAt: "2026-01-01",
  summary: `Summary ${i + 1}`,
  images: [],
  link: "",
  coverAlt: "",
  body: "A short note.",
}));

const renderHome = (animationEnabled = true) => renderToStaticMarkup(createElement(LayoutProvider, {
  children: createElement(IconProvider, {
    icons: iconLibrary,
    children: createElement(HomeView, { home, role: "Software developer", aboutTitle: "About", avatar: "", projects, animationEnabled }),
  }),
}));

describe("HomeView", () => {
  it("offers an opt-in build mode without withholding the normal content", () => {
    const html = renderHome();
    expect(html).toContain("Watch it build");
    expect(html).toContain("The lights in the sky are stars");
    expect(html).toContain("Project 1");
  });

  it("does not offer build mode in the editor preview", () => {
    expect(renderHome(false)).not.toContain("Watch it build");
  });

  it("introduces the developer and shows only the three newest projects", () => {
    const html = renderHome();
    expect(html).toContain("Software developer");
    for (const project of projects.slice(0, 3)) expect(html).toContain(project.title);
    for (const project of projects.slice(3)) expect(html).not.toContain(project.title);
  });

  it("describes short project pages without calling them case studies", () => {
    const html = renderHome();
    expect(html).toContain("About this project");
    expect(html).not.toContain("Read case study");
  });
});
