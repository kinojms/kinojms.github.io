import { Column, Heading } from "@once-ui-system/core";
import { ProjectList } from "@/components/views/ProjectList";
import type { Project, WorkContent } from "@/lib/content/format";

export function WorkView({ work, projects }: { work: WorkContent; projects: Project[] }) {
  return (
    <Column maxWidth="m" paddingTop="24">
      <Heading marginBottom="l" variant="heading-strong-xl" align="center">
        {work.title}
      </Heading>
      <ProjectList projects={projects} />
    </Column>
  );
}
