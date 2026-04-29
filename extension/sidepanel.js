// Side panel script. Reads vendor + vendorPatientId + svcBase from the URL the
// service worker set, and renders an iframe to the SVC-OS badge page.
//
// SECURITY POSTURE
// ----------------
// No PHI is read or stored here. The iframe loads /badge/<vendorPatientId> on
// the SVC-OS app, which performs authenticated PHI lookup server-side via
// Convex queries. All PHI rendering happens inside the SVC-OS origin's iframe.

(function () {
  const params = new URLSearchParams(window.location.search);
  const vendor = params.get("vendor") ?? "heartflow";
  const vendorPatientId = params.get("vendorPatientId");
  const svcBase = params.get("svcBase") ?? "http://localhost:3000";

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
