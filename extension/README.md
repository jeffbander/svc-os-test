# Cardiac CT Prior-Auth Badge — Chrome Extension

Hackathon-phase Chrome extension that surfaces prior-authorization state for
HeartFlow patients in the Chrome side panel.

## Security posture

- **No PHI in the wire format.** The extension reads only the URL of the page
  and forwards an opaque `vendorPatientId` to the side panel. PHI lookup
  happens server-side in the SVC-OS app behind Clerk auth.
- The side panel renders an iframe pointing at the SVC-OS app's `/badge/<id>`
  page. All PHI rendering happens inside the SVC-OS origin's iframe, never in
  the extension's own DOM.
- `chrome.storage` is granted in the manifest but is **not used** for PHI.
  Future use is restricted to non-PHI configuration (e.g. `svcBase` URL).

## Day-0 unknowns

The HeartFlow URL pattern in `service-worker.js`'s `HEARTFLOW_PATIENT_PATTERNS`
is a placeholder. The Day-0 spike must:

1. Log into `app.heartflow.net` and document the URL pattern (path / query / fragment).
2. Confirm there is **no PHI** (name, MRN, DOB) in the URL. If there is, redact before forwarding.
3. Confirm pushState fires on patient switch (no full reload), so the
   `webNavigation.onHistoryStateUpdated` listener catches it.

## Loading the extension (development)

1. Build the SVC-OS app and run it locally:
   ```bash
   npm run dev
   ```
2. In Chrome, open `chrome://extensions`, enable Developer Mode, click
   "Load unpacked", and select this `extension/` directory.
3. Navigate to `app.heartflow.net` and open a patient view. The side panel
   should auto-enable. Click the extension's action icon to open it.

## Distribution plan

- **Hackathon phase:** manual sideload (unpacked).
- **Pilot phase:** unlisted (not public) Chrome Web Store distribution. Anyone
  with the link can install, but it doesn't appear in search. Justification:
  a public listing pre-BAA conflicts with HIPAA posture.
- **Long-term:** Hospital IT Group Policy install once pilot validates.

## Icons

`icons/icon-{16,32,48,128}.png` are referenced by `manifest.json` but not
included in this scaffold. Generate from the design system's badge mark
before sideloading. Without icons, Chrome will use a default placeholder.

## Configuration

The SVC-OS base URL is currently hard-coded to `http://localhost:3000` in
`service-worker.js`. For preview / pilot deployments, this needs to be
plumbed through chrome.storage and an options page. Tracked as a follow-up.
