import { Column } from "@once-ui-system/core";
import { ProjectCard } from "@/components/ProjectCard";
import type { Project } from "@/lib/content/format";

interface ProjectListProps {
  /** Already sorted newest first. */
  projects: Project[];
  range?: [number, number?];
  exclude?: string[];
}

export function ProjectList({ projects, range, exclude }: ProjectListProps) {
  const visible = exclude?.length ? projects.filter((p) => !exclude.includes(p.slug)) : projects;
  const shown = range ? visible.slice(range[0] - 1, range[1] ?? visible.length) : visible;

  return (
    <Column fillWidth gap="xl" marginBottom="40" paddingX="l">
      {shown.map((project, index) => (
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
      ))}
    </Column>
  );
}
