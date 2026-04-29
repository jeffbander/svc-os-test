// Pure-function URL parser for HeartFlow patient URLs.
// Imported by service-worker.js (Chrome runtime) and by Vitest tests (Node).
// Keeps Chrome API calls out of the test path.
//
// HEARTFLOW URL PATTERN — DAY-0 SPIKE
// -----------------------------------
// The exact URL pattern for HeartFlow's web app is unverified pending the
// Day-0 spike (log into app.heartflow.net, document the URL pattern, capture
// screenshots). The placeholder regex below assumes a path segment of the
// form /patient/<id> and a query param ?p=<id>. Update this once confirmed.

export const HEARTFLOW_PATIENT_PATTERNS = [
  // Common SPA patterns — try in priority order until one matches.
  /\/patient\/([a-zA-Z0-9_-]{4,})/,   // /patient/<id>
  /\/patients\/([a-zA-Z0-9_-]{4,})/,  // /patients/<id>
  /\/study\/([a-zA-Z0-9_-]{4,})/,     // /study/<id> (some HeartFlow flows use study-id)
  /\/cases\/([a-zA-Z0-9_-]{4,})/,     // /cases/<id>
];

export function extractVendorPatientId(rawUrl) {
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
