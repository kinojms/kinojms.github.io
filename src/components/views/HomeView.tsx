import { Heading, Text, Button, Avatar, RevealFx, Column, Badge, Row } from "@once-ui-system/core";
import { ProjectList } from "@/components/views/ProjectList";
import type { HomeContent, Project } from "@/lib/content/format";

interface HomeViewProps {
  home: HomeContent;
  /** Text of the button linking to the About page (the About page title). */
  aboutTitle: string;
  avatar: string;
  /** Newest first; the first one is featured at the top. */
  projects: Project[];
}

export function HomeView({ home, aboutTitle, avatar, projects }: HomeViewProps) {
  return (
    <Column maxWidth="m" gap="xl" paddingY="12" horizontal="center">
      <Column fillWidth horizontal="center" gap="m">
        <Column maxWidth="s" horizontal="center" align="center">
          {home.featured.display && (
            <RevealFx fillWidth horizontal="center" paddingTop="16" paddingBottom="32" paddingLeft="12">
              <Badge
                background="brand-alpha-weak"
                paddingX="12"
                paddingY="4"
                onBackground="neutral-strong"
                textVariant="label-default-s"
                arrow={false}
                href={home.featured.href}
              >
                <Row paddingY="2">{home.featured.title}</Row>
              </Badge>
            </RevealFx>
          )}
          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="16">
            <Heading wrap="balance" variant="display-strong-l">
              {home.headline}
            </Heading>
          </RevealFx>
          <RevealFx translateY="8" delay={200} fillWidth horizontal="center" paddingBottom="32">
            <Text wrap="balance" onBackground="neutral-weak" variant="heading-default-xl">
              {home.subline}
            </Text>
          </RevealFx>
          <RevealFx paddingTop="12" delay={400} horizontal="center" paddingLeft="12">
            <Button id="about" data-border="rounded" href="/about" variant="secondary" size="m" weight="default" arrowIcon>
              <Row gap="8" vertical="center" paddingRight="4">
                {avatar && (
                  <Avatar marginRight="8" style={{ marginLeft: "-0.75rem" }} src={avatar} size="m" aria-hidden />
                )}
                {aboutTitle}
              </Row>
            </Button>
          </RevealFx>
        </Column>
      </Column>
      <RevealFx translateY="16" delay={600}>
        <ProjectList projects={projects} range={[1, 1]} />
      </RevealFx>
      {/* Cards below the first fade in as they scroll into view (never before the first one starts). */}
      <ProjectList projects={projects} range={[2, 7]} revealAfter={1000} />
      <Button href="/work" variant="secondary" size="m" arrowIcon>
        Explore all projects
      </Button>
    </Column>
  );
}
