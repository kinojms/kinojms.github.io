"use client";

import { useEffect, useRef, useState } from "react";
import { planBuild } from "./buildPlan";

/** Controls only Home's opt-in visual construction. The real content stays in the DOM. */
export function useHomeBuild(enabled: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const watchRef = useRef<HTMLButtonElement>(null);
  const entryScroll = useRef(0);
  const restoreFrame = useRef(0);
  const [mode, setMode] = useState(false);
  const [shellBuilt, setShellBuilt] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [enabled]);

  const enter = () => {
    cancelAnimationFrame(restoreFrame.current);
    entryScroll.current = window.scrollY;
    setShellBuilt(false);
    setMode(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const exit = () => {
    setMode(false);
    setShellBuilt(false);
    const y = entryScroll.current;
    restoreFrame.current = requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "instant" });
      watchRef.current?.focus({ preventScroll: true });
    });
  };

  useEffect(() => () => cancelAnimationFrame(restoreFrame.current), []);

  // Focus can reach any stage even before the shell pass finishes.
  useEffect(() => {
    if (!mode) return;
    const container = rootRef.current;
    if (!container) return;
    const revealFocused = (event: FocusEvent) => {
      const stage = (event.target as Element).closest<HTMLElement>("[data-build-stage]");
      if (stage && container.contains(stage)) stage.dataset.buildState = "shown";
    };
    container.addEventListener("focusin", revealFocused);
    return () => container.removeEventListener("focusin", revealFocused);
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    const root = document.documentElement;
    root.dataset.homeBuild = "shell";
    const timer = window.setTimeout(() => setShellBuilt(true), reduced ? 0 : 750);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      delete root.dataset.homeBuild;
    };
  }, [mode, reduced]);

  useEffect(() => {
    if (!mode || !shellBuilt) return;
    document.documentElement.dataset.homeBuild = "content";
    const container = rootRef.current;
    if (!container) return;
    const stages = () => [...container.querySelectorAll<HTMLElement>("[data-build-stage]")];
    let lastY = window.scrollY;
    let active: HTMLElement | null = null;
    let timer = 0;
    let frame = 0;

    const show = (el: HTMLElement) => { el.dataset.buildState = "shown"; };
    const update = () => {
      frame = 0;
      const nodes = stages();
      if (reduced) {
        window.clearTimeout(timer);
        active = null;
        nodes.forEach(show);
        return;
      }
      const y = window.scrollY;
      const pending = nodes.filter((el) => el.dataset.buildState !== "shown");
      const plan = planBuild(pending.map((el) => ({ id: el.dataset.buildStage || "", top: el.getBoundingClientRect().top })), window.innerHeight, y - lastY);
      lastY = y;
      const ready = nodes.filter((el) => plan.ready.includes(el.dataset.buildStage || ""));
      if (plan.instant) {
        window.clearTimeout(timer);
        active = null;
        ready.forEach(show);
      } else if (!active) {
        const next = ready.find((el) => el.dataset.buildState !== "shown");
        if (next) {
          active = next;
          next.dataset.buildState = "building";
          timer = window.setTimeout(() => {
            show(next);
            active = null;
            update();
          }, 650);
        }
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onFocus = (event: FocusEvent) => {
      const el = (event.target as Element).closest<HTMLElement>("[data-build-stage]");
      if (!el || !container.contains(el)) return;
      if (active === el) {
        window.clearTimeout(timer);
        active = null;
      }
      show(el);
      update();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    container.addEventListener("focusin", onFocus);
    update();
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      container.removeEventListener("focusin", onFocus);
    };
  }, [mode, shellBuilt, reduced]);

  return { mode: enabled && mode, shellBuilt, enter, exit, rootRef, watchRef };
}
