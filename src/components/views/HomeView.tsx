"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode } from "react";
import { Heading, Text, Button, Avatar, RevealFx, Column, Badge, Row } from "@once-ui-system/core";
import { ProjectList } from "@/components/views/ProjectList";
import type { HomeContent, Project } from "@/lib/content/format";
import { useHomeBuild } from "./useHomeBuild";
import styles from "./HomeBuild.module.css";

interface HomeViewProps {
  home: HomeContent;
  role: string;
  /** Text of the button linking to the About page (the About page title). */
  aboutTitle: string;
  avatar: string;
  /** Newest first; the first one is featured at the top. */
  projects: Project[];
  /** The editor preview renders this same view, but without the construction UI. */
  animationEnabled?: boolean;
}

function Cursor() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" focusable="false">
      <path d="M4.6 3.9 20.6 10.4 13 13 10.4 20.6Z" fill="currentColor" stroke="var(--page-background)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Stage({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className={styles.stage} data-build-stage={id}>
      {children}
      <span className={styles.stageCursor} aria-hidden="true"><Cursor /><span className={styles.cursorLabel}>{title}</span></span>
    </div>
  );
}

export function HomeView({ home, role, aboutTitle, avatar, projects, animationEnabled = true }: HomeViewProps) {
  const { mode, enter, exit, rootRef, watchRef } = useHomeBuild(animationEnabled);
  const exitRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (mode) exitRef.current?.focus({ preventScroll: true });
  }, [mode]);
  const badge = home.featured.display && (
    <Badge background="brand-alpha-weak" paddingX="12" paddingY="4" onBackground="neutral-strong"
      textVariant="label-default-s" arrow={false} href={home.featured.href}>
      <Row paddingY="2">{home.featured.title}</Row>
    </Badge>
  );
  const aboutButton = (
    <Button id="about" data-border="rounded" href="/about" variant="secondary" size="m" weight="default" arrowIcon>
      <Row gap="8" vertical="center" paddingRight="4">
        {avatar && <Avatar marginRight="8" style={{ marginLeft: "-0.75rem" }} src={avatar} size="m" aria-hidden />}
        {aboutTitle}
      </Row>
    </Button>
  );
  const hero = (
    <Column fillWidth horizontal="center" gap="m">
      <Column maxWidth="s" horizontal="center" align="center">
        {home.featured.display && (mode ?
          <Column fillWidth horizontal="center" paddingTop="16" paddingBottom="32" paddingLeft="12">{badge}</Column> :
          <RevealFx fillWidth horizontal="center" paddingTop="16" paddingBottom="32" paddingLeft="12">{badge}</RevealFx>
        )}
        <Text variant="label-default-s" onBackground="neutral-weak">{role}</Text>
        {mode ? (
          <Column fillWidth horizontal="center" paddingBottom="16">
            <Heading wrap="balance" variant="display-strong-l">{home.headline}</Heading>
          </Column>
        ) : (
          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="16">
            <Heading wrap="balance" variant="display-strong-l">{home.headline}</Heading>
            {animationEnabled && <span className={styles.flourish} aria-hidden="true"><Cursor /></span>}
          </RevealFx>
        )}
        {mode ? (
          <Column fillWidth horizontal="center" paddingBottom="32">
            <Text wrap="balance" onBackground="neutral-weak" variant="heading-default-xl">{home.subline}</Text>
          </Column>
        ) : (
          <RevealFx translateY="8" delay={200} fillWidth horizontal="center" paddingBottom="32">
            <Text wrap="balance" onBackground="neutral-weak" variant="heading-default-xl">{home.subline}</Text>
          </RevealFx>
        )}
        {mode ? <Column paddingTop="12" horizontal="center" paddingLeft="12">{aboutButton}</Column> :
          <RevealFx paddingTop="12" delay={400} horizontal="center" paddingLeft="12">{aboutButton}</RevealFx>}
        {animationEnabled && !mode && (
          <button ref={watchRef} type="button" className={styles.watch} onClick={enter}>
            <span aria-hidden="true">✦</span> Watch it build
          </button>
        )}
      </Column>
    </Column>
  );

  return (
    <>
      <div ref={rootRef} className={mode ? styles.theatrical : styles.normal} data-home-mode={mode ? "theatrical" : "normal"}>
        <Column maxWidth="m" gap="xl" paddingY="12" horizontal="center">
          {mode ? <Stage id="hero" title="Home">{hero}</Stage> : hero}
          {mode ? (
            [0, 1, 2].filter((index) => projects[index]).map((index) => (
              <Stage id={`project-${index}`} title={projects[index].title} key={projects[index].slug}>
                <ProjectList projects={projects} range={[index + 1, index + 1]} />
              </Stage>
            ))
          ) : (
            <>
              <RevealFx translateY="16" delay={600}>
                <ProjectList projects={projects} range={[1, 1]} />
              </RevealFx>
              {/* Cards below the first follow the hero's entrance, then reveal on scroll. */}
              <ProjectList projects={projects} range={[2, 3]} revealAfter={1000} />
            </>
          )}
          {mode ? (
            <Stage id="all-projects" title="All projects">
              <Button href="/work" variant="secondary" size="m" arrowIcon>Explore all projects</Button>
            </Stage>
          ) : (
            <Button href="/work" variant="secondary" size="m" arrowIcon>Explore all projects</Button>
          )}
        </Column>
      </div>
      {mode && typeof document !== "undefined" && createPortal(
        <button ref={exitRef} type="button" className={styles.exit} onClick={exit} aria-label="Exit build mode">
          Exit build mode
        </button>, document.body,
      )}
    </>
  );
}
