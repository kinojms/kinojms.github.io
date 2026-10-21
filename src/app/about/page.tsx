import { Metadata } from "next";
import Link from "next/link";
import { Schema } from "@once-ui-system/core";
import { about, baseURL, home, person } from "@/resources";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: about.title,
  description: about.description,
  alternates: { canonical: `${baseURL}/about` },
  openGraph: { title: about.title, description: about.description, images: [home.image] },
};

export default function About() {
  return (
    <article className={styles.page}>
      <Schema
        as="webPage"
        baseURL={baseURL}
        title={about.title}
        description={about.description}
        path={about.path}
        image={home.image}
        author={{ name: person.name, url: `${baseURL}/about`, image: `${baseURL}${person.avatar}` }}
      />

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>A LITTLE ABOUT ME / JUSTIN MORRIE SACDALAN</p>
          <h1>Developer by education.<br /><em>Creative by curiosity.</em></h1>
          <p className={styles.lede}>
            Hey there! I’m Justin, a Computer Science student majoring in Software Technology at
            De La Salle University in the Philippines. I like making things—and figuring out how
            to make them better.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="mailto:sacdalanjme@gmail.com">Let’s talk <span aria-hidden>↗</span></a>
            <Link className={styles.secondary} href="/work">Explore my projects <span aria-hidden>↗</span></Link>
          </div>
        </div>
        <div className={styles.portrait}>
          <img src={person.avatar} alt="Justin Morrie Sacdalan" width="280" height="280" />
          <span>Web · software · digital media</span>
        </div>
      </header>

      <div className={styles.rule} />

      <section className={styles.story} aria-labelledby="curiosity">
        <div className={styles.sectionLabel}><span>01 / THE THREAD</span><h2 id="curiosity">Curiosity is the through-line.</h2></div>
        <div className={styles.prose}>
          <p>I’m drawn to the space between technology and digital creativity. A web application,
            an interface, a video, or an unfamiliar idea: I enjoy turning the initial concept into
            something people can use or enjoy.</p>
          <p>My background is in web and software development, with hands-on work across React,
            Next.js, TypeScript, JavaScript, Python and Kotlin. I care as much about how an interface
            feels as how it works behind the scenes.</p>
          <p>That curiosity has led to projects like <Link href="/work/gastos-io">Gastos.io</Link>,
            a personal expense tracker, and <Link href="/work/pocket-gains">Pocket Gains</Link>,
            a game-inspired workout companion. Each project is another chance to learn something
            new and refine the details.</p>
        </div>
      </section>

      <div className={styles.rule} />

      <section className={styles.story} aria-labelledby="beyond-code">
        <div className={styles.sectionLabel}><span>02 / MORE THAN CODE</span><h2 id="beyond-code">Building for people.</h2></div>
        <div className={styles.prose}>
          <p>I’m part of <strong>The LaSallian’s Web team</strong>, contributing to website development
            and the digital publishing work of DLSU’s student publication. Working alongside an
            editorial team has given me a greater appreciation for clarity, accessibility and the
            people behind what appears on screen.</p>
          <p>Beyond code, I explore graphic design, video editing and short-form content. I manage
            social media content independently; one TikTok channel has accumulated approximately
            1.9 million views and 11,100 likes. Seeing an idea connect with an audience is just as
            rewarding as seeing software come together.</p>
          <p>I’ve also been involved with the La Salle Computer Society and the DLSU Data Science
            Society, where collaboration, events and shared curiosity have stretched me beyond
            the technical side of my degree.</p>
        </div>
      </section>

      <div className={styles.rule} />

      <section className={styles.story} aria-labelledby="approach">
        <div className={styles.sectionLabel}><span>03 / HOW I WORK</span><h2 id="approach">Ask better questions.</h2></div>
        <div className={styles.prose}>
          <p>I’m analytical and resourceful. Rather than accepting the first answer, I like to
            understand why something works, question assumptions, and try another approach when
            the result can be better.</p>
          <p>When I’m away from a project, you’ll likely find me exploring a new tool, playing video
            or tabletop games, experimenting with design, or sketching out another app idea.</p>
          <div className={styles.skills} aria-label="Areas of interest">
            <span>Web & software</span><span>UI / UX</span><span>Digital publishing</span>
            <span>Creative media</span><span>Data & research</span>
          </div>
        </div>
      </section>

      <section className={styles.contact} aria-labelledby="connect">
        <span className={styles.eyebrow}>04 / WHAT’S NEXT</span>
        <h2 id="connect">Let’s make something happen.</h2>
        <p>I’m open to interesting projects, creative collaborations and opportunities to learn
          from different perspectives. Have something in mind?</p>
        <div className={styles.actions}>
          <a className={styles.primary} href="mailto:sacdalanjme@gmail.com">Email me <span aria-hidden>↗</span></a>
          <a className={styles.secondary} href="https://www.linkedin.com/in/justin-sacdalan/" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden>↗</span></a>
          <a className={styles.secondary} href="https://github.com/kinojms" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden>↗</span></a>
        </div>
      </section>
    </article>
  );
}
