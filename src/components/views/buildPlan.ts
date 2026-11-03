export type BuildTarget = { id: string; top: number };

/** Viewport-relative section positions; large jumps skip the construction wait. */
export function planBuild(stages: BuildTarget[], viewportHeight: number, scrollDistance: number) {
  const threshold = viewportHeight * 0.9;
  return {
    ready: stages.filter((stage) => stage.top <= threshold).map((stage) => stage.id),
    instant: Math.abs(scrollDistance) >= viewportHeight * 0.8 || stages.some((stage) => stage.top < -viewportHeight * 0.2),
  };
}
