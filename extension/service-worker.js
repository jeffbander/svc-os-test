// Service worker for the Cardiac CT Prior-Auth Badge extension.
//
// SECURITY POSTURE
// ----------------
// This extension MUST NOT carry PHI in its wire format.
// The only data we read from the page is the URL, and the only thing we forward
// to the side panel is `vendorPatientId` — an opaque identifier from the vendor's
// own URL. PHI lookup happens server-side in the SVC-OS app behind Clerk auth.
// Names, MRN, DOB, and other PHI are NEVER written to chrome.storage.

import { extractVendorPatientId } from "./url-parser.js";

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
