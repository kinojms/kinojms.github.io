import { Column } from "@once-ui-system/core";
import { ProjectCard } from "@/components/ProjectCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import type { Project } from "@/lib/content/format";

interface ProjectListProps {
  /** Already sorted newest first. */
  projects: Project[];
  range?: [number, number?];
  exclude?: string[];
  /** Fade each card in as it scrolls into view, starting no earlier than this many ms after load. */
  revealAfter?: number;
}

export function ProjectList({ projects, range, exclude, revealAfter }: ProjectListProps) {
  const visible = exclude?.length
    ? projects.filter((p) => !exclude.includes(p.slug))
    : projects;
  const shown = range
    ? visible.slice(range[0] - 1, range[1] ?? visible.length)
    : visible;

  return (
    <Column fillWidth gap="xl" marginBottom="40" paddingX="l">
      {shown.map((project, index) => {
        const card = (
          <ProjectCard
            priority={index < 2}
            key={project.slug}
            href={`/work/${project.slug}`}
            images={project.images}
            title={project.title}
            description={project.summary}
            hasContent={project.body.trim() !== ""}
            avatars={[]}
            link={project.link}
          />
        );
        return revealAfter === undefined ? (
          card
        ) : (
          <ScrollReveal key={project.slug} minDelay={revealAfter}>
            {card}
          </ScrollReveal>
        );
      })}
    </Column>
  );
}
