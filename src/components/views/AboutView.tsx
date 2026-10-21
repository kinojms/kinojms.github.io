import { Fragment } from "react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import type { AboutContent, SiteContent } from "@/lib/content/format";
import styles from "./AboutView.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

export function AboutView({ site, about }: { site: SiteContent; about: AboutContent }) {
  const { person, social } = site;
  const email = social.find((s) => s.link.startsWith("mailto:"))?.link || (person.email ? `mailto:${person.email}` : "");
  const others = social.filter((s) => !s.link.startsWith("mailto:"));

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{about.hero.eyebrow}</p>
          <h1>
            {about.hero.headline}
            {about.hero.accent && (
              <>
                <br />
                <em>{about.hero.accent}</em>
              </>
            )}
          </h1>
          <p className={styles.lede}>{about.hero.lede}</p>
          <div className={styles.actions}>
            {email && (
              <a className={styles.primary} href={email}>
                Let’s talk <span aria-hidden>↗</span>
              </a>
            )}
            <Link className={styles.secondary} href="/work">
              Explore my projects <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
        {person.avatar && (
          <div className={styles.portrait}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={person.avatar} alt={person.name} width="280" height="280" />
            {about.hero.caption && <span>{about.hero.caption}</span>}
          </div>
        )}
      </header>

      {about.sections.map((section, i) => (
        <Fragment key={i}>
          <div className={styles.rule} />
          <section className={styles.story} aria-labelledby={`about-section-${i + 1}`}>
            <div className={styles.sectionLabel}>
              <span>
                {pad(i + 1)} / {section.label}
              </span>
              <h2 id={`about-section-${i + 1}`}>{section.heading}</h2>
            </div>
            <div className={styles.prose}>
              <Markdown source={section.body} variant="prose" />
              {section.tags.length > 0 && (
                <div className={styles.skills} aria-label="Areas of interest">
                  {section.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </Fragment>
      ))}

      <section className={styles.contact} aria-labelledby="connect">
        <span className={styles.eyebrow}>
          {pad(about.sections.length + 1)} / {about.contact.label}
        </span>
        <h2 id="connect">{about.contact.heading}</h2>
        <p>{about.contact.body}</p>
        <div className={styles.actions}>
          {email && (
            <a className={styles.primary} href={email}>
              Email me <span aria-hidden>↗</span>
            </a>
          )}
          {others.map((s) => (
            <a key={s.link} className={styles.secondary} href={s.link} target="_blank" rel="noopener noreferrer">
              {s.name} <span aria-hidden>↗</span>
            </a>
          ))}
        </div>
      </section>
    </article>
  );
}
