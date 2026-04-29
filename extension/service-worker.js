// Service worker for the Cardiac CT Prior-Auth Badge extension.
//
// SECURITY POSTURE
// ----------------
// This extension MUST NOT carry PHI in its wire format.
// The only data we read from the page is the URL, and the only thing we forward
// to the side panel is `vendorPatientId` — an opaque identifier from the vendor's
// own URL. PHI lookup happens server-side in the SVC-OS app behind Clerk auth.
// Names, MRN, DOB, and other PHI are NEVER written to chrome.storage.

// HEARTFLOW URL PATTERN — DAY-0 SPIKE
// -----------------------------------
// The exact URL pattern for HeartFlow's web app is unverified pending the
// Day-0 spike (log into app.heartflow.net, document the URL pattern, capture
// screenshots). The placeholder regex below assumes a path segment of the
// form /patient/<id> and a query param ?p=<id>. Update this once confirmed.
//
// Open question (must be answered Day-0):
//   1. Is there a stable vendor patient ID in the URL? Path / query / fragment?
//   2. Is there ANY PHI in the URL (name, MRN, DOB)? If yes, we redact before
//      storing or forwarding.
//   3. Does pushState happen on patient switch (no full reload)?

const HEARTFLOW_PATIENT_PATTERNS = [
  // Common SPA patterns — try in priority order until one matches.
  /\/patient\/([a-zA-Z0-9_-]{4,})/, // /patient/<id>
  /\/patients\/([a-zA-Z0-9_-]{4,})/, // /patients/<id>
  /\/study\/([a-zA-Z0-9_-]{4,})/, // /study/<id> (some HeartFlow flows use study-id)
  /\/cases\/([a-zA-Z0-9_-]{4,})/, // /cases/<id>
];

function extractVendorPatientId(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.host !== "app.heartflow.net") return null;

  for (const re of HEARTFLOW_PATIENT_PATTERNS) {
    const m = url.pathname.match(re);
    if (m && m[1]) return m[1];
  }

  // Query-param fallback
  const qp = url.searchParams.get("p") ?? url.searchParams.get("patientId") ?? url.searchParams.get("patient_id");
  if (qp && /^[a-zA-Z0-9_-]{4,}$/.test(qp)) return qp;

  // Hash-route fallback (some SPAs use #/patient/<id>)
  if (url.hash) {
    for (const re of HEARTFLOW_PATIENT_PATTERNS) {
      const m = url.hash.match(re);
      if (m && m[1]) return m[1];
    }
  }

  return null;
}

function getSvcOsBaseUrl() {
  // Set via popup/options in production. For hackathon dev, default to localhost.
  // Pilot will use the configured Mount Sinai subdomain (auth.cardiology.mountsinai.org).
  return "http://localhost:3000";
}

async function setSidePanelForTab(tabId, vendorPatientId) {
  const base = getSvcOsBaseUrl();
  const sidepanelPath = `sidepanel.html?vendor=heartflow&vendorPatientId=${encodeURIComponent(vendorPatientId)}&svcBase=${encodeURIComponent(base)}`;
  await chrome.sidePanel.setOptions({
    tabId,
    path: sidepanelPath,
    enabled: true,
  });
}

async function clearSidePanelForTab(tabId) {
  await chrome.sidePanel.setOptions({
    tabId,
    enabled: false,
  });
}

async function handleNavigation(details) {
  // Only top-level frames; ignore iframes inside HeartFlow.
  if (details.frameId !== 0) return;

  const id = extractVendorPatientId(details.url);
  if (id) {
    await setSidePanelForTab(details.tabId, id);
  } else {
    // URL doesn't match a patient view — leave the panel disabled for this tab.
    await clearSidePanelForTab(details.tabId);
  }
}

chrome.webNavigation.onCommitted.addListener(handleNavigation, {
  url: [{ hostEquals: "app.heartflow.net" }],
});
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, {
  url: [{ hostEquals: "app.heartflow.net" }],
});

// Open the side panel when the user clicks the action icon.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  }
});

// Export pure helpers for tests (Vitest can import this file in module mode).
// Chrome ignores these; they're only used by the test suite.
export { extractVendorPatientId, HEARTFLOW_PATIENT_PATTERNS };
