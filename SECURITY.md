# Security policy

## Reporting a vulnerability

If you find a security issue in this repo, **do not open a public issue**. Email:

- **notifications@providerloop.com** (primary contact)

Include:
- A description of the vulnerability
- Steps to reproduce
- Impact / affected components
- Any logs, screenshots, or proof-of-concept code (redact secrets)

You'll get an acknowledgment within 72 hours. We'll work with you on a fix and a disclosure timeline.

Security issues in the underlying **secure-vibe-coding-OS** template should additionally be reported upstream via `harperaa/secure-vibe-coding-OS`. Security issues in **gstack** should be reported via `garrytan/gstack`.

---

## Supported versions

Only the current `main` branch is supported. There is no LTS policy yet — this repo is young.

| Version | Supported |
|---------|-----------|
| main    | ✅        |
| any tag | ❌ (no backports) |

---

## Baseline security controls (inherited from SVC-OS)

The full architecture is documented in [ARCHITECTURE.md](ARCHITECTURE.md#security-architecture). Summary of what's always on:

- **HTTPS everywhere.** HSTS in production. No HTTP fallback.
- **CSP headers** — strict Content-Security-Policy with allowlisted Clerk + Convex origins.
- **Clickjacking prevention** — `X-Frame-Options: DENY`.
- **CSRF protection** — HMAC-SHA256 tokens in HTTP-only, SameSite=Strict cookies.
- **Rate limiting** — 5 requests per minute per IP, HTTP 429 on excess.
- **Input validation** — Zod schemas at every user-input boundary; `<`, `>`, `"`, `&` stripped.
- **Auth** — Clerk middleware protects `/dashboard/**`. Admin routes gated by `ADMIN_EMAIL`.
- **Webhook signature verification** — Svix, every webhook, no exceptions.
- **Environment-aware error responses** — full details in dev, generic in prod.
- **Dependency scanning** — `npm audit` in CI.
- **Security event monitoring** — 19+ tracked event types, real-time admin dashboard.

---

## Off-limits files

The following files are load-bearing for the security baseline. Do NOT modify them without:

1. Running `/gstack-freeze <file>` at the start of the session
2. A deliberate, reviewed change
3. Passing `/security-assessment` (SVC-OS's 5-agent orchestrator) AND `/gstack-cso`
4. Human reviewer sign-off

```
middleware.ts
next.config.ts
lib/security.ts
lib/security.*
lib/validation.*
lib/errors.*
convex/auth.*
.claude/agents/**
.claude/skills/security/**
```

See [INTEGRATION.md — Invariants](INTEGRATION.md#the-7-invariants-non-negotiable) for the enforcement rules.

---

## In scope

- Authentication + authorization bypasses
- CSRF / XSS / injection in first-party code
- Privilege escalation via the admin dashboard
- Webhook forgery
- Rate-limit bypasses that enable abuse
- Secret exposure in logs, error responses, or client bundles
- Dependency vulnerabilities (reported via `npm audit` or Snyk)
- Prompt injection in the AI chatbot (if enabled)

## Out of scope

- Issues in upstream SVC-OS that haven't been reported to `harperaa/secure-vibe-coding-OS` first
- Issues in upstream gstack that haven't been reported to `garrytan/gstack` first
- Issues in Clerk, Convex, Vercel, Svix, or Stripe platforms — report to the respective vendor
- Missing security headers that are already set by Vercel at the edge
- Self-XSS (attacker needs victim to run arbitrary code in their own DevTools)
- Denial-of-service via massive legitimate traffic (use Vercel's built-in protections)
- Social engineering of maintainers

---

## Development-time security

### Secrets
- `.env.local` is gitignored. Never commit it.
- `.env.example` documents required keys with placeholder values. Keep it updated.
- API keys for Clerk/Convex/Stripe are rotated via each provider's dashboard, not stored in this repo.

### Branch rules (from CLAUDE.md)
- Never rebase or merge into `main` directly.
- PRs to `main` only. 1 reviewer minimum. You cannot approve your own PR.
- `testing` is a shared integration branch. Merge-only, never rebase.
- Feature branches rebase off `main` via `/sync-feature-branch`.

### AI-specific guardrails
- `.vibesafeignore` lists paths AI should not ingest.
- gstack skills respect `CLAUDE.md` invariants — no modifications to off-limits files without explicit opt-in.
- `/gstack-freeze <scope>` enforces edit boundaries during debug sessions.
- `/gstack-careful` and `/gstack-guard` warn before destructive commands.

---

## Incident response (self-hosted)

If you suspect a compromise:

1. **Rotate all secrets** in the Clerk, Convex, Vercel, and Stripe dashboards. Update `.env.local` and re-deploy.
2. **Revoke active Clerk sessions** via the Clerk dashboard.
3. **Check the security monitoring dashboard** (`/dashboard/security`) for recent events — look for spikes in `suspicious_activity`, `jwt_validation_failed`, or `unauthorized_access`.
4. **Review Vercel logs** for unexpected deploys or config changes.
5. **Run `npm audit`** to check for recently disclosed dependency vulnerabilities.
6. Open a private security advisory on this repo (`gh security advisory create`) and keep the rest of the team informed.

---

## Acknowledgments

- **Dr. Allen Harper** — the SVC-OS security architecture is his work.
- **Garry Tan** — gstack provides additional audit capabilities (`/gstack-cso`) and browser-side injection defense.
- Anyone who privately reports a vulnerability will be credited in the CHANGELOG entry that lands the fix, with their consent.
