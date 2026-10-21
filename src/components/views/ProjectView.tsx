import { Column, Heading, Media, Text, SmartLink, Line, Row } from "@once-ui-system/core";
import { Markdown } from "@/components/Markdown";
import { ProjectList } from "@/components/views/ProjectList";
import { formatDate } from "@/utils/formatDate";
import type { Project } from "@/lib/content/format";

interface ProjectViewProps {
  project: Project;
  /** All projects, newest first (for "Related projects"). */
  projects: Project[];
}

export function ProjectView({ project, projects }: ProjectViewProps) {
  return (
    <Column as="section" maxWidth="m" horizontal="center" gap="l">
      <Column maxWidth="s" gap="16" horizontal="center" align="center">
        <SmartLink href="/work">
          <Text variant="label-strong-m">Projects</Text>
        </SmartLink>
        <Text variant="body-default-xs" onBackground="neutral-weak" marginBottom="12">
          {project.publishedAt && formatDate(project.publishedAt)}
        </Text>
        <Heading variant="display-strong-m">{project.title}</Heading>
      </Column>
      {/* Spacer kept from the template's (unused) team row so the layout is unchanged. */}
      <Row marginBottom="32" horizontal="center" />
      {project.images.length > 0 && (
        <Media
          priority
          aspectRatio="16 / 9"
          radius="m"
          alt={project.coverAlt || project.title}
          src={project.images[0]}
        />
      )}
      <Column style={{ margin: "auto" }} as="article" maxWidth="xs">
        <Markdown source={project.body} />
      </Column>
      <Column fillWidth gap="40" horizontal="center" marginTop="40">
        <Line maxWidth="40" />
        <Heading as="h2" variant="heading-strong-xl" marginBottom="24">
          Related projects
        </Heading>
        <ProjectList projects={projects} exclude={[project.slug]} range={[2]} />
      </Column>
    </Column>
  );
}
