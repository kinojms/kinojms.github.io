"use client";

import React, { useEffect, useRef, useState } from "react";
import { ToggleButton, useTheme } from "@once-ui-system/core";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState("light");
  const transitioning = useRef(false);

  useEffect(() => {
    setCurrentTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);

  useEffect(() => {
    setCurrentTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, [theme]);

  const icon = currentTheme === "dark" ? "light" : "dark";
  const nextTheme = currentTheme === "light" ? "dark" : "light";

  const changeTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (transitioning.current) return;

    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      setTheme(next);
      return;
    }

    // Capture the old page, switch the real theme beneath it, then contract
    // the old snapshot into the button to reveal the new page at the edges.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    transitioning.current = true;
    // Once UI animates inherited colors for up to two seconds. Those changes
    // continue behind the snapshot and flash when it disappears at 950 ms.
    document.documentElement.classList.add("theme-switching");
    const transition = document.startViewTransition(() => setTheme(next));
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(${radius}px at ${x}px ${y}px)`,
              `circle(0px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 950,
            easing: "cubic-bezier(0.45, 0, 0.2, 1)",
            fill: "forwards",
            pseudoElement: "::view-transition-old(root)",
          },
        );
      })
      .catch(() => {}) // Navigation can cancel a transition before it is ready.
      .finally(() => {
        transition.finished.finally(() => {
          document.documentElement.classList.remove("theme-switching");
          transitioning.current = false;
        });
      });
  };

  return (
    <ToggleButton
      prefixIcon={icon}
      onClick={changeTheme}
      aria-label={`Switch to ${nextTheme} mode`}
    />
  );
};
