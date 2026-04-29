import { describe, it, expect } from "vitest";
import { ALL_AUTH_STATES, HEARTFLOW_CPT_CODES, CPT_DESCRIPTIONS } from "../convex/priorAuthTypes";

describe("prior-auth seed fixtures", () => {
  it("ALL_AUTH_STATES has 11 distinct states (per DESIGN.md)", () => {
    expect(ALL_AUTH_STATES.length).toBe(11);
    expect(new Set(ALL_AUTH_STATES).size).toBe(11);
  });

  it("HEARTFLOW_CPT_CODES contains the two MVP CPT codes", () => {
    expect(HEARTFLOW_CPT_CODES).toEqual(["75577", "75580"]);
  });

  it("each MVP CPT code has a human-readable description", () => {
    for (const c of HEARTFLOW_CPT_CODES) {
      expect(CPT_DESCRIPTIONS[c]).toBeTruthy();
      expect(CPT_DESCRIPTIONS[c].length).toBeGreaterThan(10);
    }
  });

  it("75577 description references FFR-CT (HeartFlow's flagship product)", () => {
    expect(CPT_DESCRIPTIONS["75577"]).toMatch(/FFR-?CT/i);
  });

  it("75580 description references plaque analysis", () => {
    expect(CPT_DESCRIPTIONS["75580"]).toMatch(/plaque/i);
  });
});
