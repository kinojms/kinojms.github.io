import { describe, expect, it } from "vitest";
import { planBuild } from "./buildPlan";

const stages = [
  { id: "hero", top: 80 },
  { id: "first", top: 920 },
  { id: "second", top: 1450 },
];

describe("planBuild", () => {
  it("starts only sections reached by the viewport", () => {
    expect(planBuild(stages, 800, 0)).toEqual({ ready: ["hero"], instant: false });
  });

  it("catches up every passed section when scrolling quickly", () => {
    expect(planBuild(stages.map((s) => ({ ...s, top: s.top - 1250 })), 800, 1250))
      .toEqual({ ready: ["hero", "first", "second"], instant: true });
  });

  it("catches up when an unbuilt section is already above the viewport", () => {
    expect(planBuild([{ id: "past", top: -200 }, { id: "current", top: 350 }], 800, 100))
      .toEqual({ ready: ["past", "current"], instant: true });
  });

  it("uses a small margin so a card can start building before it fully enters", () => {
    expect(planBuild([{ id: "card", top: 700 }], 800, 100))
      .toEqual({ ready: ["card"], instant: false });
  });
});
