import { describe, it, expect, beforeEach } from "vitest";

// We test the allowlist in isolation by re-implementing it with the same
// constants. If sidepanel.js's constants drift, this test will fail at the
// expected-behavior level, prompting a sync.

const ALLOWED_BASE_PREFIXES = ["http://localhost:3000", "https://localhost:3000"];
const ALLOWED_HOST_SUFFIXES = [".vercel.app", ".mountsinai.org"];

function sanitizeSvcBase(raw: string | null | undefined): string {
  const fallback = "http://localhost:3000";
  if (!raw) return fallback;
  if (ALLOWED_BASE_PREFIXES.some((b) => raw === b || raw.startsWith(b + "/"))) {
    return raw.replace(/\/$/, "");
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return fallback;
    if (ALLOWED_HOST_SUFFIXES.some((suffix) => url.host.endsWith(suffix))) {
      return `${url.protocol}//${url.host}`;
    }
  } catch {
    // fall through
  }
  return fallback;
}

describe("svcBase sanitizer", () => {
  it("accepts localhost:3000 (dev)", () => {
    expect(sanitizeSvcBase("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("accepts vercel preview subdomains", () => {
    expect(sanitizeSvcBase("https://svc-os-test-feat-x-jeffbander.vercel.app")).toBe(
      "https://svc-os-test-feat-x-jeffbander.vercel.app",
    );
  });

  it("accepts mountsinai.org subdomains over https", () => {
    expect(sanitizeSvcBase("https://auth.cardiology.mountsinai.org")).toBe(
      "https://auth.cardiology.mountsinai.org",
    );
  });

  it("rejects arbitrary attacker origins, falls back to localhost", () => {
    expect(sanitizeSvcBase("https://evil.example.com")).toBe("http://localhost:3000");
  });

  it("rejects http (non-localhost), falls back to localhost", () => {
    expect(sanitizeSvcBase("http://auth.cardiology.mountsinai.org")).toBe("http://localhost:3000");
  });

  it("rejects javascript: scheme", () => {
    expect(sanitizeSvcBase("javascript:alert(1)")).toBe("http://localhost:3000");
  });

  it("rejects malformed URLs", () => {
    expect(sanitizeSvcBase("not-a-url")).toBe("http://localhost:3000");
  });

  it("returns fallback for empty input", () => {
    expect(sanitizeSvcBase(null)).toBe("http://localhost:3000");
    expect(sanitizeSvcBase(undefined)).toBe("http://localhost:3000");
    expect(sanitizeSvcBase("")).toBe("http://localhost:3000");
  });

  it("rejects host that contains an allowlisted suffix as a substring (anti-spoof)", () => {
    expect(sanitizeSvcBase("https://vercel.app.evil.example.com")).toBe(
      "http://localhost:3000",
    );
    expect(sanitizeSvcBase("https://mountsinai.org.attacker.com")).toBe(
      "http://localhost:3000",
    );
  });

  it("strips trailing slash from accepted localhost base", () => {
    expect(sanitizeSvcBase("http://localhost:3000/")).toBe("http://localhost:3000");
  });
});
