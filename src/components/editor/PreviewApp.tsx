"use client";

import { useEffect, useState } from "react";
import "katex/dist/katex.min.css";
import { Column, Heading, Text } from "@once-ui-system/core";
import { HomeView } from "@/components/views/HomeView";
import { AboutView } from "@/components/views/AboutView";
import { WorkView } from "@/components/views/WorkView";
import { ProjectView } from "@/components/views/ProjectView";
import { Footer } from "@/components/Footer";
import { backgroundOf, sortProjects, type PortfolioContent } from "@/lib/content/format";
import { viewForPath, type FromPreview, type PreviewView, type ToPreview } from "@/lib/editor/preview";

/** Show the edited background (sharp image + CSS blur, scaled like the build's 1600px pre-blur). */
function usePreviewBackground(src: string | null) {
  useEffect(() => {
    if (!src) return;
    const root = document.documentElement;
    const fit = () => {
      const scale = Math.max(window.innerWidth / 1600, window.innerHeight / 900);
      root.style.setProperty("--preview-bg-blur", `${(14 * scale).toFixed(2)}px`);
    };
    root.style.setProperty("--preview-bg", `url(${JSON.stringify(src)})`);
    root.classList.add("preview-bg");
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      root.classList.remove("preview-bg");
      root.style.removeProperty("--preview-bg");
      root.style.removeProperty("--preview-bg-blur");
    };
  }, [src]);
}

/** Renders the editor's unsaved content with the real page components, inside the site layout. */
export function PreviewApp() {
  const [state, setState] = useState<{ view: PreviewView; content: PortfolioContent } | null>(null);
  const [framed, setFramed] = useState(true);
  usePreviewBackground(state ? backgroundOf(state.content.site) : null);

  useEffect(() => {
    if (window.parent === window) {
      setFramed(false);
      return;
    }
    document.documentElement.classList.add("is-preview");
    const send = (msg: FromPreview) => window.parent.postMessage(msg, window.location.origin);

    const onMessage = (e: MessageEvent<ToPreview>) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type !== "pe:update") return;
      setState((prev) => {
        const changedView = !prev || JSON.stringify(prev.view) !== JSON.stringify(e.data.view);
        if (changedView) window.scrollTo(0, 0);
        return { view: e.data.view, content: e.data.content };
      });
    };

    // Keep the preview on its own page: internal links switch the previewed page instead.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (/^(mailto:|tel:)/.test(href)) {
        e.preventDefault();
        return;
      }
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        e.preventDefault();
        window.open(url.href, "_blank", "noopener,noreferrer");
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const view = viewForPath(url.pathname);
      if (view) send({ type: "pe:navigate", view });
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    send({ type: "pe:ready" });
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
      document.documentElement.classList.remove("is-preview");
    };
  }, []);

  if (!framed)
    return (
      <Column paddingY="128" horizontal="center" gap="16">
        <Heading>Preview</Heading>
        <Text onBackground="neutral-weak">This page shows live previews inside the editor at /edit/.</Text>
      </Column>
    );

  if (!state) return null;

  const { view, content } = state;
  const projects = sortProjects(content.projects);
  let page: React.ReactNode;
  switch (view.kind) {
    case "home":
      page = <HomeView home={content.home} aboutTitle={content.about.title} avatar={content.site.person.avatar} projects={projects} />;
      break;
    case "about":
      page = <AboutView site={content.site} about={content.about} />;
      break;
    case "work":
      page = <WorkView work={content.work} projects={projects} />;
      break;
    case "project": {
      const project = projects.find((p) => p.slug === view.slug);
      page = project ? (
        <ProjectView project={project} projects={projects} />
      ) : (
        <Column paddingY="128" horizontal="center">
          <Text onBackground="neutral-weak">This project doesn't exist (yet).</Text>
        </Column>
      );
      break;
    }
  }

  return (
    <Column fillWidth horizontal="center">
      {page}
      <Footer className="preview-footer" name={content.site.person.name} social={content.site.social} />
    </Column>
  );
}
