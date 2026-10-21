"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import s from "./Editor.module.css";
import { AboutForm, HomeForm, ProfileForm, ProjectsForm, SaveForm, type Update } from "./sections";
import { ThemeToggle } from "@/components/ThemeToggle";
import { imageRepoPath, referencedImages, validate, type PortfolioContent } from "@/lib/content/format";
import { createGitHub, GitHubError, SITE_REPO, type Snapshot } from "@/lib/editor/github";
import { computeChanges, pullRequestBody, rebaseEdits, snapshotContent, type PendingImages } from "@/lib/editor/changes";
import { clearDraft, readDraft, writeDraft } from "@/lib/editor/draftStore";
import { clearToken, getToken, setToken, TOKEN_URL } from "@/lib/editor/token";
import { sameView, withPendingImages, type FromPreview, type PreviewView, type ToPreview } from "@/lib/editor/preview";
import type { ProcessedImage } from "@/lib/editor/images";

type Tab = "profile" | "home" | "about" | "projects" | "save";
const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "save", label: "Save" },
];

type Phase =
  | { name: "boot" }
  | { name: "framed" }
  | { name: "signin"; error?: string }
  | { name: "loading" }
  | { name: "error"; message: string }
  | { name: "ready" };

const errorText = (e: unknown) =>
  e instanceof GitHubError ? e.message : e instanceof Error ? e.message : "Something went wrong. Please try again.";

/** Rendered straight into <body> so it sits above the site header/footer (outside <main>'s stacking context). */
function BodyPortal({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.body), []);
  return el ? createPortal(children, el) : null;
}

export function EditorApp() {
  return (
    <BodyPortal>
      <Editor />
    </BodyPortal>
  );
}

function Editor() {
  const [phase, setPhase] = useState<Phase>({ name: "boot" });
  const [token, setTokenState] = useState("");
  const [login, setLogin] = useState("");

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [pending, setPending] = useState<PendingImages>({});
  // Images saved to the draft branch but not on the live site yet (shown in the preview only).
  const [draftImages, setDraftImages] = useState<Record<string, string>>({});
  const [restored, setRestored] = useState<"same" | "rebased" | "older" | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const [tab, setTab] = useState<Tab>("profile");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<PreviewView>({ kind: "about" });
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [pane, setPane] = useState<"edit" | "preview">("edit");

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ message: string; paths: string[] } | null>(null);
  const [saveResult, setSaveResult] = useState<{ url: string; number: number; created: boolean } | null>(null);
  const [storageFull, setStorageFull] = useState(false);

  const gh = useMemo(() => (token ? createGitHub(token, SITE_REPO) : null), [token]);

  // ---- boot: refuse to run inside another site's frame; pick up a token from this tab ----
  useEffect(() => {
    if (window.top !== window.self) {
      setPhase({ name: "framed" });
      return;
    }
    const t = getToken();
    if (t) setTokenState(t);
    else setPhase({ name: "signin" });
  }, []);

  const load = useCallback(
    async (opts: { keepDraft: boolean }) => {
      if (!gh) return;
      setPhase({ name: "loading" });
      try {
        const who = await gh.checkAccess();
        setLogin(who.login);
        const snap = await gh.load();
        const stored = opts.keepDraft ? readDraft() : null;
        const rebased =
          stored && !(stored.snapshot.headSha === snap.headSha && stored.snapshot.branch === snap.branch)
            ? rebaseEdits(stored.snapshot, stored.content, stored.pending || {}, snap)
            : null;
        if (stored && rebased) {
          // The site changed since these edits, but not the parts they touch: carry them over.
          setSnapshot(snap);
          setContent(rebased);
          setPending(stored.pending || {});
          setRestored("rebased");
        } else if (stored) {
          // Keep the version the edits were made on so conflicting changes are detected on save.
          setSnapshot(stored.snapshot);
          setContent(stored.content);
          setPending(stored.pending || {});
          setRestored(stored.snapshot.headSha === snap.headSha && stored.snapshot.branch === snap.branch ? "same" : "older");
        } else {
          clearDraft();
          setSnapshot(snap);
          setContent(snapshotContent(snap));
          setPending({});
          setRestored(null);
        }
        setResetKey((k) => k + 1);
        setPhase({ name: "ready" });
      } catch (e) {
        if (e instanceof GitHubError && (e.kind === "auth" || e.kind === "forbidden")) {
          clearToken();
          setTokenState("");
          setPhase({ name: "signin", error: e.message });
        } else setPhase({ name: "error", message: errorText(e) });
      }
    },
    [gh],
  );

  useEffect(() => {
    if (gh) load({ keepDraft: true });
  }, [gh, load]);

  // ---- derived state ----
  const changes = useMemo(
    () => (snapshot && content ? computeChanges(snapshot, content, pending) : { writes: [], deletes: [], summary: [] }),
    [snapshot, content, pending],
  );
  const dirty = changes.writes.length + changes.deletes.length > 0;
  const issues = useMemo(() => (content ? validate(content) : []), [content]);
  const savedSlugs = useMemo(() => new Set(snapshot ? snapshotContent(snapshot).projects.map((p) => p.slug) : []), [snapshot]);

  // ---- autosave unsaved work in this browser ----
  useEffect(() => {
    if (phase.name !== "ready" || !snapshot || !content) return;
    const t = setTimeout(() => {
      if (!dirty) {
        clearDraft();
        setStorageFull(false);
      } else setStorageFull(!writeDraft({ snapshot, content, pending, savedAt: new Date().toISOString() }));
    }, 400);
    return () => clearTimeout(t);
  }, [phase.name, snapshot, content, pending, dirty]);

  // Warn before closing the tab if autosave couldn't store the edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty && storageFull) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, storageFull]);

  const update: Update = useCallback((fn) => {
    setContent((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setSaveResult(null);
    setSaveError(null);
  }, []);

  const addImage = useCallback((path: string, img: ProcessedImage) => {
    setPending((p) => ({ ...p, [path]: { dataUrl: img.dataUrl, base64: img.base64 } }));
  }, []);

  // ---- preview follows the tab being edited ----
  useEffect(() => {
    const next: PreviewView | null =
      tab === "home" ? { kind: "home" } : tab === "about" || tab === "profile" ? { kind: "about" } : tab === "projects" ? (selected ? { kind: "project", slug: selected } : { kind: "work" }) : null;
    if (next) setView((v) => (sameView(v, next) ? v : next));
  }, [tab, selected]);

  // Fetch images that exist on the draft branch but aren't served by the site yet.
  // Each path is checked once per session (not on every keystroke).
  const checkedImages = useRef(new Set<string>());
  useEffect(() => {
    if (!gh || !snapshot || !content) return;
    const missing = [...referencedImages(content)].filter(
      (p) => !pending[p] && !draftImages[p] && snapshot.images[imageRepoPath(p)] && !checkedImages.current.has(p),
    );
    missing.forEach((p) => checkedImages.current.add(p));
    (async () => {
      for (const path of missing) {
        try {
          const head = await fetch(path, { method: "HEAD", cache: "no-store" });
          if (head.ok) continue;
          const b64 = await gh.blobBase64(snapshot.images[imageRepoPath(path)]);
          const ext = path.split(".").pop()?.toLowerCase();
          const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/webp";
          setDraftImages((d) => ({ ...d, [path]: `data:${mime};base64,${b64}` }));
        } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gh, snapshot, content]);

  const frame = useRef<HTMLIFrameElement>(null);
  /** Unsaved uploads plus draft-only images, for thumbnails and the preview. */
  const displayImages = useMemo(() => {
    const all: PendingImages = { ...pending };
    for (const [path, dataUrl] of Object.entries(draftImages)) if (!all[path]) all[path] = { dataUrl, base64: "" };
    return all;
  }, [pending, draftImages]);
  const previewContent = useMemo(() => (content ? withPendingImages(content, displayImages) : null), [content, displayImages]);

  const post = useCallback(() => {
    const win = frame.current?.contentWindow;
    if (!win || !previewContent) return;
    const msg: ToPreview = { type: "pe:update", view, content: previewContent };
    win.postMessage(msg, window.location.origin);
  }, [view, previewContent]);

  useEffect(() => {
    const id = requestAnimationFrame(post);
    return () => cancelAnimationFrame(id);
  }, [post]);

  useEffect(() => {
    const onMessage = (e: MessageEvent<FromPreview>) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === "pe:ready") post();
      if (e.data?.type === "pe:navigate") {
        const v = e.data.view;
        setView(v);
        if (v.kind === "project") {
          setTab("projects");
          setSelected(v.slug);
        } else if (v.kind === "work") {
          setTab("projects");
          setSelected(null);
        } else setTab(v.kind);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  // ---- save ----
  const save = async () => {
    if (!gh || !snapshot || !content) return;
    setSaving(true);
    setSaveError(null);
    setSaveResult(null);
    try {
      const title = note.trim() || `Edit portfolio: ${changes.summary.slice(0, 3).join(", ")}${changes.summary.length > 3 ? ", …" : ""}`;
      const res = await gh.save({ snapshot, writes: changes.writes, deletes: changes.deletes, title, body: pullRequestBody(changes.summary, note) });
      // Continue from exactly what was just saved (GitHub's pull request list can lag behind).
      const fresh = res.snapshot;
      setDraftImages((d) => ({ ...d, ...Object.fromEntries(Object.entries(pending).map(([p, i]) => [p, i.dataUrl])) }));
      clearDraft();
      setSnapshot(fresh);
      setContent(snapshotContent(fresh));
      setPending({});
      setRestored(null);
      setNote("");
      setSaveResult({ url: res.pr.url, number: res.pr.number, created: res.created });
    } catch (e) {
      setSaveError({ message: errorText(e), paths: e instanceof GitHubError ? e.paths : [] });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!snapshot || !confirm("Throw away all unsaved changes?")) return;
    clearDraft();
    setContent(snapshotContent(snapshot));
    setPending({});
    setRestored(null);
    setSaveError(null);
    setResetKey((k) => k + 1);
  };

  const reload = () => {
    if (dirty && !confirm("Reloading discards your unsaved changes. Continue?")) return;
    clearDraft();
    setSaveError(null);
    setSaveResult(null);
    load({ keepDraft: false });
  };

  const signOut = () => {
    clearToken();
    setTokenState("");
    setPhase({ name: "signin" });
  };

  // ---- screens ----
  if (phase.name === "boot") return <div className={s.shell} data-editor-shell />;
  if (phase.name === "framed")
    return (
      <div className={s.shell} data-editor-shell>
        <div className={s.center}>The editor can't be opened inside another page.</div>
      </div>
    );
  if (phase.name === "signin") return <SignIn error={phase.error} onToken={(t) => (setToken(t), setTokenState(t))} />;
  if (phase.name === "error")
    return (
      <div className={s.shell} data-editor-shell>
        <div className={s.center}>
          <div className={s.signin} role="alert">
            <h1>Couldn't load</h1>
            <p>{phase.message}</p>
            <div className={s.row}>
              <button className={`${s.btn} ${s.btnPrimary}`} style={{ flex: "none" }} onClick={() => load({ keepDraft: true })}>
                Try again
              </button>
              <button className={s.btn} style={{ flex: "none" }} onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  if (phase.name === "loading" || !snapshot || !content)
    return (
      <div className={s.shell} data-editor-shell aria-busy="true">
        <div className={s.center}>
          <div>
            <div className={s.spinner} />
            Loading your portfolio from GitHub…
          </div>
        </div>
      </div>
    );

  const common = { content, update, pending: displayImages, addImage };
  const issueCount = issues.length;

  return (
    <div className={s.shell} data-editor-shell>
      <header className={s.topbar}>
        <span className={s.brand}>Portfolio editor</span>
        <span className={`${s.status} ${dirty ? s.statusDirty : ""}`} role="status">
          {dirty ? `Unsaved changes · kept in this browser${storageFull ? " (storage full!)" : ""}` : snapshot.pr ? `Draft #${snapshot.pr.number} open` : "No changes"}
        </span>
        <span className={s.spacer} />
        <div className={s.topActions}>
          <div className={s.mobileSwitch} role="group" aria-label="Show">
            <button className={`${s.btn} ${s.btnSmall} ${pane === "edit" ? s.btnSelected : ""}`} onClick={() => setPane("edit")}>
              Edit
            </button>
            <button className={`${s.btn} ${s.btnSmall} ${pane === "preview" ? s.btnSelected : ""}`} onClick={() => setPane("preview")} style={{ marginLeft: 4 }}>
              Preview
            </button>
          </div>
          <a className={`${s.btn} ${s.btnSmall} ${s.btnGhost} ${s.hideOnMobile}`} href="/" target="_blank" rel="noopener">
            View site ↗
          </a>
          <span className={`${s.hint} ${s.hideOnMobile}`} title={`Signed in to GitHub as ${login}`}>
            {login}
          </span>
          <button className={`${s.btn} ${s.btnSmall}`} onClick={signOut}>
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className={s.main}>
        <section className={`${s.editPane} ${pane === "preview" ? s.hideOnMobile : ""}`} aria-label="Editor">
          <nav className={s.tabs} aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${s.tab} ${tab === t.id ? s.tabActive : ""}`}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => {
                  setTab(t.id);
                  if (t.id === "projects") setSelected(null);
                }}
              >
                {t.label}
                {t.id === "save" && issueCount > 0 && <span className={s.tabBadge}>{issueCount}</span>}
              </button>
            ))}
          </nav>
          <div className={s.scroll} key={`${resetKey}-${tab}`}>
            {restored && (
              <div className={`${s.notice} ${restored === "older" ? s.noticeWarn : ""}`}>
                <div className={s.noticeTitle}>Restored your unsaved changes</div>
                {restored === "older"
                  ? "They were made on an older version, and some of the same content has changed on GitHub since. Saving will stop and ask you to reload; copy anything you want to keep first."
                  : restored === "rebased"
                    ? "The site changed on GitHub since, but not the parts you edited, so your edits were moved onto the latest version."
                    : "Picked up where you left off."}{" "}
                <button className={`${s.btn} ${s.btnSmall} ${s.btnGhost}`} onClick={() => setRestored(null)}>
                  OK
                </button>
              </div>
            )}
            {tab === "profile" && <ProfileForm {...common} />}
            {tab === "home" && <HomeForm {...common} />}
            {tab === "about" && <AboutForm {...common} />}
            {tab === "projects" && <ProjectsForm {...common} selected={selected} onSelect={setSelected} savedSlugs={savedSlugs} />}
            {tab === "save" && (
              <SaveForm
                issues={issues}
                summary={changes.summary}
                note={note}
                onNote={setNote}
                onSave={save}
                saving={saving}
                draftUrl={snapshot.pr?.url}
                draftNumber={snapshot.pr?.number}
                result={saveResult}
                error={saveError}
                onReload={reload}
                onDiscard={discard}
              />
            )}
          </div>
        </section>

        <section className={`${s.previewPane} ${pane === "edit" ? s.hideOnMobile : ""}`} aria-label="Live preview">
          <div className={s.previewBar}>
            <span>Live preview</span>
            <span className={s.spacer} />
            <button className={`${s.btn} ${s.btnSmall} ${device === "desktop" ? s.btnSelected : ""} ${s.hideOnMobile}`} onClick={() => setDevice("desktop")}>
              Desktop
            </button>
            <button className={`${s.btn} ${s.btnSmall} ${device === "phone" ? s.btnSelected : ""} ${s.hideOnMobile}`} onClick={() => setDevice("phone")}>
              Phone
            </button>
          </div>
          <div className={s.previewStage}>
            <iframe ref={frame} title="Live preview of your portfolio" src="/edit/preview/" className={`${s.previewFrame} ${device === "phone" ? s.previewPhone : ""}`} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SignIn({ error, onToken }: { error?: string; onToken: (t: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className={s.shell} data-editor-shell>
      <div className={s.center}>
        <form
          className={s.signin}
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onToken(value.trim());
          }}
        >
          <h1>Portfolio editor</h1>
          <p className={s.help}>Edit your portfolio here and save changes as a draft on GitHub. Nothing goes live until you merge the draft.</p>
          {error && (
            <div className={`${s.notice} ${s.noticeError}`} role="alert">
              {error}
            </div>
          )}
          <ol className={s.steps}>
            <li>
              <a className={s.link} href={TOKEN_URL} target="_blank" rel="noopener noreferrer">
                Create a GitHub access token ↗
              </a>{" "}
              (the name and permissions are filled in for you).
            </li>
            <li>
              Under <strong>Repository access</strong>, choose <strong>Only select repositories</strong> → <span className={s.code}>kinojms.github.io</span>.
            </li>
            <li>
              Check that <strong>Contents</strong> and <strong>Pull requests</strong> say <strong>Read and write</strong>, then press <strong>Generate token</strong>.
            </li>
            <li>Copy the token and paste it below.</li>
          </ol>
          <div className={s.field}>
            <label className={s.label} htmlFor="token">
              Access token
            </label>
            <input
              id="token"
              className={s.input}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="github_pat_…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <span className={s.hint}>Kept only in this tab and forgotten when you close it. It's never saved to the site.</span>
          </div>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={!value.trim()}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
