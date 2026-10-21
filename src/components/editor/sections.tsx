"use client";

import type { ReactNode } from "react";
import s from "./Editor.module.css";
import { Checkbox, ImagePicker, ListInput, Select, TextArea, TextInput } from "./fields";
import { iconLibrary } from "@/resources/icons";
import { slugify, type PortfolioContent, type Project, type ValidationIssue } from "@/lib/content/format";
import { UPLOAD_DIR, type PendingImages } from "@/lib/editor/changes";
import type { ProcessedImage } from "@/lib/editor/images";

export type Update = (fn: (draft: PortfolioContent) => void) => void;

type Common = {
  content: PortfolioContent;
  update: Update;
  pending: PendingImages;
  addImage: (publicPath: string, img: ProcessedImage) => void;
};

const MD_HELP = (
  <>
    Markdown: <span className={s.code}>**bold**</span> <span className={s.code}>*italic*</span>{" "}
    <span className={s.code}>[link](https://…)</span> <span className={s.code}>## Heading</span>{" "}
    <span className={s.code}>- list item</span>; leave a blank line between paragraphs.{" "}
    <a className={s.link} href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noopener noreferrer">
      Cheat sheet ↗
    </a>
  </>
);

const imgSrc = (pending: PendingImages, path: string) => pending[path]?.dataUrl ?? path;

function uploadPath(base: string, ext: string) {
  const name = slugify(base) || "image";
  return `${UPLOAD_DIR}/${name}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
}

function Section({ title, help, children }: { title: string; help?: ReactNode; children: ReactNode }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{title}</h2>
      {help && <p className={s.help}>{help}</p>}
      {children}
    </section>
  );
}

function SeoFields({ value, onTitle, onDescription }: { value: { title: string; description: string }; onTitle: (v: string) => void; onDescription: (v: string) => void }) {
  return (
    <Section title="Search & link previews" help="Shown in Google results and when this page is shared on LinkedIn, Messenger, etc.">
      <TextInput label="Page title" value={value.title} onChange={onTitle} hint={`${value.title.length}/60 characters recommended`} />
      <TextArea label="Description" value={value.description} onChange={onDescription} rows={3} hint={`${value.description.length}/160 characters recommended`} />
    </Section>
  );
}

// ------------------------------------------------------------------------------------------
export function ProfileForm({ content, update, pending, addImage }: Common) {
  const { person, social } = content.site;
  const icons = Object.keys(iconLibrary)
    .filter((k) => !/^arrow|^open|^home$|^grid$|^book$|^gallery$|^eye|^calendar$|^document$|^rocket$|^javascript$|^nextjs$|^supabase$|^figma$|^person$/.test(k))
    .sort();
  return (
    <>
      <Section title="You">
        <TextInput
          label="Full name"
          value={person.name}
          onChange={(v) =>
            update((d) => {
              d.site.person.name = v;
              const parts = v.trim().split(/\s+/);
              d.site.person.firstName = parts[0] || "";
              d.site.person.lastName = parts.length > 1 ? parts[parts.length - 1] : "";
            })
          }
          hint="Shown in the footer, About page and search results."
        />
        <TextInput label="Role" value={person.role} onChange={(v) => update((d) => void (d.site.person.role = v))} />
        <TextInput label="Email" type="email" value={person.email} onChange={(v) => update((d) => void (d.site.person.email = v))} hint="Used by the “Let’s talk” button on the About page." />
        <ImagePicker
          label="Profile photo"
          kind="avatar"
          src={imgSrc(pending, person.avatar)}
          hint="Square crop, resized to 512×512. Shown on Home and About."
          onPick={(img) => {
            const path = uploadPath("avatar", img.ext);
            addImage(path, img);
            update((d) => void (d.site.person.avatar = path));
          }}
        />
      </Section>

      <Section title="Links" help="Shown as icons in the footer and as buttons on the About page. An Email link should look like mailto:you@example.com.">
        {social.map((link, i) => (
          <div className={s.card} key={i}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>{link.name || `Link ${i + 1}`}</span>
              <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnGhost}`} aria-label="Move up" disabled={i === 0} onClick={() => update((d) => move(d.site.social, i, i - 1))}>
                ↑
              </button>
              <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnGhost}`} aria-label="Move down" disabled={i === social.length - 1} onClick={() => update((d) => move(d.site.social, i, i + 1))}>
                ↓
              </button>
              <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`} onClick={() => update((d) => void d.site.social.splice(i, 1))}>
                Remove
              </button>
            </div>
            <div className={s.row}>
              <TextInput label="Name" value={link.name} onChange={(v) => update((d) => void (d.site.social[i].name = v))} />
              <Select
                label="Icon"
                value={link.icon}
                onChange={(v) => update((d) => void (d.site.social[i].icon = v))}
                options={icons.map((k) => ({ value: k, label: k }))}
              />
            </div>
            <TextInput label="URL" type="url" value={link.link} onChange={(v) => update((d) => void (d.site.social[i].link = v.trim()))} placeholder="https://…" />
          </div>
        ))}
        <button type="button" className={s.btn} onClick={() => update((d) => void d.site.social.push({ name: "", icon: "globe", link: "https://", essential: true }))}>
          + Add link
        </button>
      </Section>
    </>
  );
}

// ------------------------------------------------------------------------------------------
export function HomeForm({ content, update }: Common) {
  const { home, projects } = content;
  const current = home.featured.href.match(/^\/work\/([^/]+)\/?$/)?.[1] ?? "";
  return (
    <>
      <Section title="Intro">
        <TextArea label="Headline" value={home.headline} onChange={(v) => update((d) => void (d.home.headline = v))} rows={2} />
        <TextArea label="Intro text" value={home.subline} onChange={(v) => update((d) => void (d.home.subline = v))} rows={4} />
      </Section>
      <Section title="Featured badge" help="The small pill above the headline.">
        <Checkbox label="Show the badge" checked={home.featured.display} onChange={(v) => update((d) => void (d.home.featured.display = v))} />
        {home.featured.display && (
          <>
            <TextInput label="Badge text" value={home.featured.title} onChange={(v) => update((d) => void (d.home.featured.title = v))} />
            <Select
              label="Links to"
              value={current}
              onChange={(v) => update((d) => void (d.home.featured.href = `/work/${v}`))}
              options={[
                ...(current && !projects.some((p) => p.slug === current) ? [{ value: current, label: `(missing) ${current}` }] : []),
                ...projects.map((p) => ({ value: p.slug, label: p.title || p.slug })),
              ]}
            />
          </>
        )}
      </Section>
      <SeoFields value={home} onTitle={(v) => update((d) => void (d.home.title = v))} onDescription={(v) => update((d) => void (d.home.description = v))} />
    </>
  );
}

// ------------------------------------------------------------------------------------------
export function AboutForm({ content, update }: Common) {
  const { about } = content;
  return (
    <>
      <Section title="Top of the page">
        <TextInput label="Small label" value={about.hero.eyebrow} onChange={(v) => update((d) => void (d.about.hero.eyebrow = v))} />
        <TextInput label="Headline" value={about.hero.headline} onChange={(v) => update((d) => void (d.about.hero.headline = v))} />
        <TextInput label="Headline, second line" value={about.hero.accent} onChange={(v) => update((d) => void (d.about.hero.accent = v))} hint="Shown lighter, under the headline. Leave empty to hide." />
        <TextArea label="Intro" value={about.hero.lede} onChange={(v) => update((d) => void (d.about.hero.lede = v))} rows={4} />
        <TextInput label="Photo caption" value={about.hero.caption} onChange={(v) => update((d) => void (d.about.hero.caption = v))} />
      </Section>

      <Section title="Sections" help={<>Each section has a numbered label, a heading and text. {MD_HELP}</>}>
        {about.sections.map((sec, i) => (
          <div className={s.card} key={i}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>
                {String(i + 1).padStart(2, "0")} · {sec.heading || "Untitled"}
              </span>
              <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnGhost}`} aria-label="Move up" disabled={i === 0} onClick={() => update((d) => move(d.about.sections, i, i - 1))}>
                ↑
              </button>
              <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnGhost}`} aria-label="Move down" disabled={i === about.sections.length - 1} onClick={() => update((d) => move(d.about.sections, i, i + 1))}>
                ↓
              </button>
              <button
                type="button"
                className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`}
                onClick={() => {
                  if (confirm(`Remove the section “${sec.heading || i + 1}”?`)) update((d) => void d.about.sections.splice(i, 1));
                }}
              >
                Remove
              </button>
            </div>
            <div className={s.row}>
              <TextInput label="Label" value={sec.label} onChange={(v) => update((d) => void (d.about.sections[i].label = v))} />
              <TextInput label="Heading" value={sec.heading} onChange={(v) => update((d) => void (d.about.sections[i].heading = v))} />
            </div>
            <TextArea label="Text" large value={sec.body} onChange={(v) => update((d) => void (d.about.sections[i].body = v))} />
            <ListInput label="Tags (optional)" value={sec.tags} onChange={(v) => update((d) => void (d.about.sections[i].tags = v))} hint="Comma-separated, shown as pills under the text." />
          </div>
        ))}
        <button type="button" className={s.btn} onClick={() => update((d) => void d.about.sections.push({ label: "NEW SECTION", heading: "", body: "", tags: [] }))}>
          + Add section
        </button>
      </Section>

      <Section title="Closing call to action" help="Buttons come from your links on the Profile tab.">
        <TextInput label="Label" value={about.contact.label} onChange={(v) => update((d) => void (d.about.contact.label = v))} />
        <TextInput label="Heading" value={about.contact.heading} onChange={(v) => update((d) => void (d.about.contact.heading = v))} />
        <TextArea label="Text" value={about.contact.body} onChange={(v) => update((d) => void (d.about.contact.body = v))} rows={3} />
      </Section>
      <SeoFields value={about} onTitle={(v) => update((d) => void (d.about.title = v))} onDescription={(v) => update((d) => void (d.about.description = v))} />
    </>
  );
}

// ------------------------------------------------------------------------------------------
export function ProjectsForm(
  props: Common & {
    selected: string | null;
    onSelect: (slug: string | null) => void;
    savedSlugs: Set<string>;
  },
) {
  const { content, update, pending, addImage, selected, onSelect, savedSlugs } = props;
  const index = content.projects.findIndex((p) => p.slug === selected);
  const project: Project | undefined = content.projects[index];
  const featuredSlug = content.home.featured.display ? content.home.featured.href.match(/^\/work\/([^/]+)\/?$/)?.[1] : undefined;

  const addProject = () => {
    const taken = new Set(content.projects.map((p) => p.slug));
    let slug = "new-project";
    for (let n = 2; taken.has(slug); n++) slug = `new-project-${n}`;
    update((d) => {
      d.projects.unshift({
        slug,
        title: "New project",
        publishedAt: new Date().toISOString().slice(0, 10),
        summary: "",
        images: [],
        link: "",
        coverAlt: "",
        body: "## Overview\n\nWhat it is, who it's for and why you built it.\n\n**Stack:** \n",
      });
    });
    onSelect(slug);
  };

  if (!project) {
    return (
      <>
        <Section title="Your projects" help="Projects are shown newest first, by date. The newest one is featured at the top of the Home page.">
          <div className={s.projectList}>
            {content.projects.map((p) => (
              <button type="button" key={p.slug} className={s.projectItem} onClick={() => onSelect(p.slug)}>
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={s.thumb} src={imgSrc(pending, p.images[0])} alt="" />
                ) : (
                  <span className={s.thumb} />
                )}
                <span>
                  <strong>{p.title || "Untitled"}</strong>
                  <br />
                  <span className={s.projectMeta}>{p.publishedAt}</span>
                </span>
                {!savedSlugs.has(p.slug) ? <span className={`${s.pill} ${s.pillNew}`}>new</span> : featuredSlug === p.slug ? <span className={s.pill}>featured</span> : <span />}
              </button>
            ))}
          </div>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={addProject}>
            + Add project
          </button>
        </Section>
        <SeoFields value={content.work} onTitle={(v) => update((d) => void (d.work.title = v))} onDescription={(v) => update((d) => void (d.work.description = v))} />
      </>
    );
  }

  const isNew = !savedSlugs.has(project.slug);
  const set = (fn: (p: Project) => void) => update((d) => fn(d.projects[index]));

  return (
    <>
      <button type="button" className={`${s.btn} ${s.btnGhost}`} style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => onSelect(null)}>
        ← All projects
      </button>
      <Section title={isNew ? "New project" : "Project"}>
        <TextInput
          label="Title"
          value={project.title}
          onChange={(v) => {
            // A new project's web address follows its title until it's first saved or edited by hand.
            const follow = isNew && (project.slug === slugify(project.title) || /^new-project(-\d+)?$/.test(project.slug));
            const slug = follow ? slugify(v) || project.slug : project.slug;
            set((p) => {
              p.title = v;
              p.slug = slug;
            });
            if (slug !== project.slug) onSelect(slug);
          }}
        />
        <TextInput
          label="Web address"
          value={project.slug}
          disabled={!isNew}
          onChange={(v) => {
            const slug = v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-/, "");
            set((p) => void (p.slug = slug));
            onSelect(slug);
          }}
          hint={isNew ? <>kinojms.github.io/work/{project.slug || "…"}/ — can't be changed after the first save.</> : <>kinojms.github.io/work/{project.slug}/ (fixed once published, so links keep working)</>}
        />
        <div className={s.row}>
          <TextInput label="Date" type="date" value={project.publishedAt} onChange={(v) => set((p) => void (p.publishedAt = v))} hint="Sets the order." />
          <TextInput label="Project link (optional)" type="url" value={project.link} onChange={(v) => set((p) => void (p.link = v.trim()))} placeholder="https://…" />
        </div>
        <TextArea label="Summary" value={project.summary} onChange={(v) => set((p) => void (p.summary = v))} rows={3} hint="One or two sentences, shown on project cards and in search results." />
        <ImagePicker
          label="Cover image"
          kind="cover"
          src={project.images[0] ? imgSrc(pending, project.images[0]) : ""}
          hint="Shown 16:9 on cards. Resized to at most 1600×1200 and saved as WebP."
          onPick={(img) => {
            const path = uploadPath(project.slug || project.title, img.ext);
            addImage(path, img);
            set((p) => void (p.images = [path, ...p.images.slice(1)]));
          }}
          onRemove={() => set((p) => void (p.images = p.images.slice(1)))}
        />
        {project.images[0] && <TextInput label="Cover description (alt text)" value={project.coverAlt} onChange={(v) => set((p) => void (p.coverAlt = v))} hint="Describes the image for screen readers. Defaults to the title." />}
        <TextArea label="Write-up" large value={project.body} onChange={(v) => set((p) => void (p.body = v))} hint={<>Leave empty to hide the “Read case study” link. {MD_HELP}</>} />
      </Section>
      <Section title="Danger zone">
        <button
          type="button"
          className={`${s.btn} ${s.btnDanger}`}
          disabled={featuredSlug === project.slug}
          title={featuredSlug === project.slug ? "This project is featured on Home. Pick another featured project first." : undefined}
          onClick={() => {
            if (!confirm(`Delete “${project.title || project.slug}”? Its page and cover image are removed when the draft is merged.`)) return;
            update((d) => void d.projects.splice(index, 1));
            onSelect(null);
          }}
        >
          Delete project
        </button>
        {featuredSlug === project.slug && <p className={s.hint}>This project is featured on the Home page, so it can't be deleted. Change the featured badge on the Home tab first.</p>}
      </Section>
    </>
  );
}

// ------------------------------------------------------------------------------------------
export function SaveForm(props: {
  issues: ValidationIssue[];
  summary: string[];
  note: string;
  onNote: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  draftUrl?: string;
  draftNumber?: number;
  result: { url: string; number: number; created: boolean } | null;
  error: { message: string; paths: string[] } | null;
  onReload: () => void;
  onDiscard: () => void;
}) {
  const { issues, summary } = props;
  return (
    <>
      {props.result && (
        <div className={`${s.notice} ${s.noticeOk}`} role="status">
          <div className={s.noticeTitle}>{props.result.created ? "Draft saved" : "Draft updated"} ✓</div>
          Your changes are in{" "}
          <a className={s.link} href={props.result.url} target="_blank" rel="noopener noreferrer">
            pull request #{props.result.number} ↗
          </a>
          . Nothing is live yet. On GitHub, wait for the green check, then press <strong>Merge pull request</strong> to publish; the site updates
          about a minute later. You can keep editing here: saving again adds to the same draft.
        </div>
      )}
      {props.error && (
        <div className={`${s.notice} ${s.noticeError}`} role="alert">
          <div className={s.noticeTitle}>Couldn't save</div>
          {props.error.message}
          {props.error.paths.length > 0 && (
            <ul className={s.issues}>
              {props.error.paths.map((p) => (
                <li key={p}>
                  <span className={s.code}>{p}</span>
                </li>
              ))}
            </ul>
          )}
          <p className={s.hint} style={{ marginTop: 8 }}>
            Your edits are still kept in this browser.
          </p>
        </div>
      )}

      <Section title="Save as draft" help="Saving opens (or updates) a pull request on GitHub. The live site only changes when you merge it.">
        {props.draftUrl && (
          <p className={s.help}>
            You're continuing{" "}
            <a className={s.link} href={props.draftUrl} target="_blank" rel="noopener noreferrer">
              draft #{props.draftNumber} ↗
            </a>
            .
          </p>
        )}
        {issues.length > 0 && (
          <div className={`${s.notice} ${s.noticeWarn}`}>
            <div className={s.noticeTitle}>Fix these before saving</div>
            <ul className={s.issues}>
              {issues.map((i, n) => (
                <li key={n}>
                  <strong>{i.where}:</strong> {i.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={s.notice}>
          <div className={s.noticeTitle}>{summary.length ? "Changes" : "No changes yet"}</div>
          {summary.length > 0 ? (
            <ul className={s.changes}>
              {summary.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <span className={s.hint}>Edit something on the other tabs and it will show up here.</span>
          )}
        </div>
        <TextInput label="Short note (optional)" value={props.note} onChange={props.onNote} placeholder="e.g. Update About, add Bean Board project" />
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={props.saving || issues.length > 0 || summary.length === 0} onClick={props.onSave}>
          {props.saving ? "Saving…" : props.draftUrl ? "Save to draft" : "Save draft"}
        </button>
      </Section>

      <Section title="Other actions">
        <div className={s.row} style={{ flexWrap: "wrap" }}>
          <button type="button" className={s.btn} style={{ flex: "none" }} onClick={props.onReload}>
            Reload from GitHub
          </button>
          <button type="button" className={`${s.btn} ${s.btnDanger}`} style={{ flex: "none" }} disabled={summary.length === 0} onClick={props.onDiscard}>
            Discard unsaved changes
          </button>
        </div>
      </Section>
    </>
  );
}
