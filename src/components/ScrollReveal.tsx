"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./ScrollReveal.module.css";

interface ScrollRevealProps {
  children: ReactNode;
  /** Earliest time (ms after the page appears) the reveal may start, so items
   *  already on screen at load follow the page's own entrance animation. */
  minDelay?: number;
  /** Transition length in ms. */
  duration?: number;
}

/** Hides its content until it scrolls into view, then reveals it once. */
export function ScrollReveal({
  children,
  minDelay = 0,
  duration = 1400,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"hidden" | "shown" | "done">("hidden");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mountedAt = performance.now();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setState("done");
      return;
    }
    let showTimer: number | undefined;
    let doneTimer: number | undefined;
    const reveal = () => {
      observer.disconnect();
      const wait = Math.max(0, minDelay - (performance.now() - mountedAt));
      showTimer = window.setTimeout(() => {
        setState("shown");
        // Drop the mask afterwards so it can't clip hover effects or focus rings.
        doneTimer = window.setTimeout(() => setState("done"), duration);
      }, wait);
    };
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && reveal(),
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    // Keyboard users tabbing into a hidden card should see it.
    el.addEventListener("focusin", reveal, { once: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("focusin", reveal);
      window.clearTimeout(showTimer);
      window.clearTimeout(doneTimer);
    };
  }, [minDelay, duration]);

  const className =
    state === "done"
      ? undefined
      : `${styles.reveal} ${state === "shown" ? styles.shown : styles.hidden}`;
  return (
    <div
      ref={ref}
      className={className}
      style={
        state === "done"
          ? undefined
          : { transitionDuration: `${duration}ms`, width: "100%" }
      }
      data-scroll-reveal={state}
    >
      {children}
    </div>
  );
}
