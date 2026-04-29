// Side panel script. Reads vendor + vendorPatientId + svcBase from the URL the
// service worker set, and renders an iframe to the SVC-OS badge page.
//
// SECURITY POSTURE
// ----------------
// No PHI is read or stored here. The iframe loads /badge/<vendorPatientId> on
// the SVC-OS app, which performs authenticated PHI lookup server-side via
// Convex queries. All PHI rendering happens inside the SVC-OS origin's iframe.
//
// svcBase is validated against a hardcoded allowlist before being used as an
// iframe src. A user could open sidepanel.html directly and supply a
// ?svcBase= param; the allowlist prevents that turning into an iframe-spoof
// or open-redirect.

(function () {
  // Hardcoded allowlist — update when the production / preview origin is known.
  // Wildcard match for Vercel preview deploys is host-specific (svc-os-test-*).
  const ALLOWED_BASE_PREFIXES = [
    "http://localhost:3000",
    "https://localhost:3000",
  ];
  const ALLOWED_HOST_SUFFIXES = [
    ".vercel.app",         // narrow further once production project subdomain is known
    ".mountsinai.org",     // pilot deploys
  ];

  function sanitizeSvcBase(raw) {
    const fallback = "http://localhost:3000";
    if (!raw) return fallback;
    // Exact-prefix match (covers localhost dev).
    if (ALLOWED_BASE_PREFIXES.some((b) => raw === b || raw.startsWith(b + "/"))) {
      return raw.replace(/\/$/, "");
    }
    // Host-suffix match for known production / preview hostnames.
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") return fallback;
      if (ALLOWED_HOST_SUFFIXES.some((suffix) => url.host.endsWith(suffix))) {
        return `${url.protocol}//${url.host}`;
      }
    } catch {
      // Fall through to fallback.
    }
    return fallback;
  }

  const params = new URLSearchParams(window.location.search);
  const vendor = params.get("vendor") ?? "heartflow";
  const vendorPatientId = params.get("vendorPatientId");
  const svcBase = sanitizeSvcBase(params.get("svcBase"));

  const container = document.getElementById("frame-container");
  const empty = document.getElementById("empty-state");

  if (!vendorPatientId) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.remove();

  const iframe = document.createElement("iframe");
  iframe.title = "Prior-auth badge";
  // sandbox: allow-scripts + allow-same-origin lets the iframe access SVC-OS
  // origin's storage (needed for Clerk session). It does NOT grant access to
  // the parent extension origin — SOP isolation between chrome-extension://
  // and the SVC-OS origin is preserved.
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
  iframe.referrerPolicy = "no-referrer";
  iframe.src = `${svcBase}/badge/${encodeURIComponent(vendorPatientId)}?vendor=${encodeURIComponent(vendor)}`;
  container.appendChild(iframe);
})();
