import { describe, it, expect } from "vitest";
import { extractVendorPatientId } from "../extension/url-parser.js";

// HEARTFLOW URL PATTERN — DAY-0 SPIKE
// These tests document our placeholder assumption. Once the Day-0 spike
// confirms the real URL pattern, update HEARTFLOW_PATIENT_PATTERNS in
// service-worker.js and add concrete fixtures captured from the live app.

describe("extractVendorPatientId", () => {
  it("returns null for non-HeartFlow hosts", () => {
    expect(extractVendorPatientId("https://example.com/patient/abc123")).toBeNull();
    expect(extractVendorPatientId("https://www.heartflow.com/patient/abc123")).toBeNull();
  });

  it("extracts ID from /patient/<id> path", () => {
    expect(
      extractVendorPatientId("https://app.heartflow.net/patient/abc123def"),
    ).toBe("abc123def");
  });

  it("extracts ID from /patients/<id> path", () => {
    expect(
      extractVendorPatientId("https://app.heartflow.net/patients/HF-9999"),
    ).toBe("HF-9999");
  });

  it("extracts ID from /study/<id> path (some HeartFlow flows)", () => {
    expect(
      extractVendorPatientId("https://app.heartflow.net/study/study_abc_123"),
    ).toBe("study_abc_123");
  });

  it("extracts ID from query param ?p=<id>", () => {
    expect(
      extractVendorPatientId("https://app.heartflow.net/dashboard?p=hf-104782"),
    ).toBe("hf-104782");
  });

  it("extracts ID from hash route #/patient/<id>", () => {
    expect(
      extractVendorPatientId("https://app.heartflow.net/app#/patient/legacy-id"),
    ).toBe("legacy-id");
  });

  it("returns null when URL is malformed", () => {
    expect(extractVendorPatientId("not-a-url")).toBeNull();
  });

  it("returns null when no patient pattern matches", () => {
    expect(extractVendorPatientId("https://app.heartflow.net/")).toBeNull();
    expect(extractVendorPatientId("https://app.heartflow.net/settings")).toBeNull();
  });

  it("rejects too-short IDs to avoid garbage matches", () => {
    expect(extractVendorPatientId("https://app.heartflow.net/patient/ab")).toBeNull();
  });
});
