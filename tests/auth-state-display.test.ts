import { describe, it, expect } from "vitest";
import { ALL_AUTH_STATES } from "../convex/priorAuthTypes";
import { STATE_LABEL, STATE_PILL_TONE, STATE_COLUMN_ORDER } from "../lib/auth-state-display";

describe("auth-state-display", () => {
  it("has a label for every auth state", () => {
    for (const s of ALL_AUTH_STATES) {
      expect(STATE_LABEL[s]).toBeTruthy();
    }
  });

  it("has a pill tone for every auth state", () => {
    for (const s of ALL_AUTH_STATES) {
      expect(STATE_PILL_TONE[s]).toBeTruthy();
    }
  });

  it("maps approved to approved tone (green pill)", () => {
    expect(STATE_PILL_TONE.approved).toBe("approved");
  });

  it("maps denied and expired to denied tone (red pill) — design D2", () => {
    expect(STATE_PILL_TONE.denied).toBe("denied");
    expect(STATE_PILL_TONE.expired).toBe("denied");
  });

  it("maps in-flight states (more_info / p2p / appealed) to italic mustard tone", () => {
    expect(STATE_PILL_TONE.more_info_required).toBe("pending-italic");
    expect(STATE_PILL_TONE.peer_to_peer_required).toBe("pending-italic");
    expect(STATE_PILL_TONE.appealed).toBe("pending-italic");
  });

  it("maps withdrawn/cancelled to strikethrough tone (gray, struck text)", () => {
    expect(STATE_PILL_TONE.withdrawn).toBe("strikethrough");
    expect(STATE_PILL_TONE.cancelled).toBe("strikethrough");
  });

  it("STATE_COLUMN_ORDER contains every auth state exactly once", () => {
    const sorted = [...STATE_COLUMN_ORDER].sort();
    const expected = [...ALL_AUTH_STATES].sort();
    expect(sorted).toEqual(expected);
    expect(STATE_COLUMN_ORDER.length).toBe(ALL_AUTH_STATES.length);
  });

  it("uses lowercase labels (matches editorial-clinical wb-pill text-transform)", () => {
    for (const s of ALL_AUTH_STATES) {
      expect(STATE_LABEL[s]).toBe(STATE_LABEL[s].toLowerCase());
    }
  });
});
