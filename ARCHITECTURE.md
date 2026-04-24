# ARCHITECTURE.md — stack contract and security baseline

This document describes what this repo is built on and which pieces are load-bearing. When you're about to change something, read this first to know whether you're touching a frozen piece (invariant) or a fair-game piece.

All of the below is inherited from upstream `harperaa/secure-vibe-coding-OS` except where marked otherwise.

---

## Stack at a glance

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (user)                                             │
│  - Next.js 15 app (App Router, RSC, Turbopack)              │
│  - Tailwind v4 + shadcn/ui + Radix + Framer Motion          │
│  - Clerk React components (sign-in, user button, billing)   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │  HTTPS (Vercel edge)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js server (Vercel)                                    │
│  - middleware.ts         ← route protection (Clerk auth)    │
│  - next.config.ts        ← CSP / HSTS / X-Frame headers     │
│  - app/**                ← pages + API routes               │
│  - lib/security.ts       ← CSRF, rate limit, input sanitize │
│  - lib/validation.ts     ← Zod schemas                      │
│  - lib/errors.ts         ← env-aware error responses        │
└─────┬──────────────────┬────────────────────────┬───────────┘
      │                  │                        │
      │ SDK              │ SDK                    │ webhook
      ▼                  ▼                        ▼
┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐
│  Convex      │  │  Clerk       │  │  Svix                  │
│  - DB        │  │  - Auth      │  │  - webhook handling    │
│  - Functions │  │  - Billing   │  │  - user.created, etc.  │
│  - Realtime  │  │  - Sessions  │  └────────────────────────┘
│  - convex/   │  │  - Orgs      │
│    auth.ts   │  └──────────────┘
└──────────────┘
```

---

## Technology choices (frozen — invariant #1)

| Concern | Tech | Why it's frozen |
|---|---|---|
| Framework | Next.js 15 App Router | SVC-OS's security model (middleware, headers, server actions) is Next-specific. |
| Build / dev | Turbopack | Default in Next 15; no reason to diverge. |
| Language | TypeScript (strict) | SVC-OS's validation + error helpers are typed; JS would lose the guarantees. |
| Styling | Tailwind v4 | Design system (shadcn/ui) is built on top. |
| UI components | shadcn/ui + Radix + Framer Motion + Motion Primitives | Component inventory is already accessible + animated. |
| Icons | Lucide React + Tabler Icons | Two libraries intentionally — Lucide for system, Tabler for decorative. |
| Charts | Recharts | Used in the dashboard. |
| Database + backend | Convex (real-time) | Serverless + realtime. Auth is wired to Clerk. Migrating off is a multi-week rewrite. |
| Auth | Clerk | Session management, middleware hooks, org support, webhooks all integrated. |
| Billing | Clerk Billing (Stripe under the hood) | Subscription model matched to the payment-gated route. |
| Webhooks | Svix | Clerk ships Svix for webhook validation; reuse the infra. |
| Deploy | Vercel | `/deploy-to-dev` and `/deploy-to-prod` assume Vercel. |
| Package manager | npm | Lockfile + CI expect npm. |
| Node | 20+ | Vercel default + Next 15 baseline. |
| Test runner | Vitest | Documented in upstream CLAUDE.md. |

**Changing any of the above requires:** an ADR-style entry in `CHANGELOG.md`, an update to `INTEGRATION.md` removing the stack from the invariants, and a PR that passes both `/security-assessment` and `/gstack-cso`.

---

## Directory layout

```
svc-os-test/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing
│   ├── dashboard/          # Authenticated dashboard
│   │   ├── page.tsx
│   │   ├── payment-gated/  # Subscription-gated content
│   │   └── security/       # Admin-only security monitoring
│   └── clerk-users-webhook/  # Svix webhook endpoint
│
├── components/             # React components (shadcn/ui + custom)
│
├── convex/                 # Convex backend
│   ├── auth.ts             # ⚠️ OFF-LIMITS (security-critical)
│   ├── schema.ts           # Data model
│   └── *.ts                # Query + mutation functions
│
├── hooks/                  # React custom hooks
│
├── lib/                    # Shared utilities
│   ├── security.ts         # ⚠️ OFF-LIMITS — CSRF, rate limit, sanitize
│   ├── validation.ts       # ⚠️ OFF-LIMITS — Zod schemas
│   └── errors.ts           # ⚠️ OFF-LIMITS — env-aware error handling
│
├── middleware.ts           # ⚠️ OFF-LIMITS — route protection
├── next.config.ts          # ⚠️ OFF-LIMITS — CSP, HSTS, security headers
│
├── public/                 # Static assets (blog images, etc.)
├── content/blog/           # MDX blog posts
│
├── scripts/                # Setup + deployment automation
├── secure-vibe-kit/        # Security skills package (from upstream)
│
├── .claude/
│   ├── commands/           # 37 SVC-OS slash commands (/install, /commit, etc.)
│   ├── agents/             # ⚠️ OFF-LIMITS — 5 security agents
│   ├── skills/
│   │   ├── lessons/        # Dynamic lessons library (read every session)
│   │   ├── security/       # ⚠️ OFF-LIMITS — security skill reference
│   │   └── self-installer/
│   ├── settings.json       # Claude Code config
│   └── statusline.sh       # Status line script
│
├── .cursor/rules           # Cursor IDE configuration
├── .vibesafeignore         # AI-sensitive paths
├── .env.example            # Template for .env.local (never commit .env.local)
│
├── CLAUDE.md               # Loaded every session — contract + invariants
├── README.md               # Project overview (this integration)
├── INTEGRATION.md          # SVC-OS ↔ gstack contract
├── ONBOARDING.md           # New-dev setup guide
├── ARCHITECTURE.md         # This file
├── SECURITY.md             # Security policy
├── CHANGELOG.md            # Version history
├── DEPLOYMENT.md           # Deploy guide (unchanged from upstream)
│
└── docs/
    ├── UPSTREAM_README.md  # Original SVC-OS README preserved
    ├── course/             # Masterclass course modules
    ├── security/           # Security deep-dives
    └── templates/          # Boilerplate for new features
```

Legend: `⚠️ OFF-LIMITS` means you need `/gstack-freeze <file>` + deliberate change + passing `/security-assessment` before the change can merge.

---

## Security architecture

The baseline is defense-in-depth. Each layer exists because the layer above can fail.

### Layer 1 — Transport + headers

Set in `next.config.ts`. Applied to every response by Next.js middleware:

- `Strict-Transport-Security` — HSTS in production, 2-year max-age
- `Content-Security-Policy` — strict CSP, specific allowlist for Clerk + Convex
- `X-Frame-Options: DENY` — no framing
- `X-Content-Type-Options: nosniff`
- `X-Robots-Tag: noindex, nofollow` — adjust per page as needed
- `Referrer-Policy: strict-origin-when-cross-origin`

### Layer 2 — Route protection

`middleware.ts` enforces:

- Authentication (Clerk) required for `/dashboard/**`
- Admin-only access (via `ADMIN_EMAIL` env var) for `/dashboard/security`
- Public routes explicitly listed; everything else defaults to protected

### Layer 3 — CSRF

`lib/security.ts` generates CSRF tokens via HMAC-SHA256 bound to the session. Tokens live in HTTP-only, `SameSite=Strict` cookies. Every state-changing request validates the token; mismatches return 403 and log an `csrf_validation_failed` event.

### Layer 4 — Rate limiting

5 requests per minute per IP address (IP extracted from `x-forwarded-for` with `x-real-ip` fallback). Exceeding the limit returns HTTP 429 and logs `rate_limit_exceeded`. Tunable in `lib/security.ts`.

### Layer 5 — Input validation

Every user-supplied value goes through a Zod schema in `lib/validation.ts`:

```
emailSchema, safeTextSchema, safeLongTextSchema,
usernameSchema, urlSchema, contactFormSchema,
createPostSchema, updateProfileSchema
```

Sanitization strips `<`, `>`, `"`, `&` as a second line of defense (React's JSX escaping is the third). Failures log `input_validation_failed`.

### Layer 6 — Error handling

`lib/errors.ts` exposes:

```
handleApiError(error, context)
handleValidationError(message, details)
handleForbiddenError(message)
handleUnauthorizedError(message)
handleNotFoundError(resource)
```

In development, full stack traces. In production, generic messages with no internal details. This prevents information leakage through error responses.

### Layer 7 — Monitoring

Admin-only dashboard at `/dashboard/security`. Real-time security event tracking with severity classification (Critical / High / Medium / Low). Tracked event types (19+):

```
origin_mismatch                rate_limit_exceeded
invalid_api_key                fingerprint_change
suspicious_activity            jwt_validation_failed
unauthorized_access            input_validation_failed
replay_detected                csrf_validation_failed
xss_attempt                    prompt_injection_attempt
fingerprint_manipulation       http_origin_blocked
```

Events are persisted via Convex and queryable by severity, type, and time range.

### Layer 8 — Dependency + supply chain

- `npm audit` runs in CI
- Clerk + Convex SDKs versioned in `package.json`, not auto-updated
- Webhook signatures verified via Svix before any handler runs
- `.vibesafeignore` lists paths AI should not ingest (credentials, logs, etc.)

### Layer 9 — AI-specific guardrails

- `prompt_injection_attempt` event type tracked
- `.claude/skills/security/ai-chat-protection` documents the AI chatbot threat model
- gstack's own prompt injection defense runs in the browser sidebar (unrelated to this app's runtime, but relevant during development when using `/gstack-open-gstack-browser` against this app)

---

## Data flow — Clerk webhook → Convex

```
Clerk Dashboard
   │
   │  user.created / user.updated / user.deleted / paymentAttempt.updated
   ▼
Svix  (signs the payload)
   │
   │  POST  /clerk-users-webhook
   ▼
app/clerk-users-webhook/route.ts
   │
   │  1. Verify Svix signature (reject if invalid)
   │  2. Rate-limit check
   │  3. Parse + validate payload (Zod)
   │  4. Call Convex mutation
   ▼
convex/users.ts  (or payments.ts)
   │
   │  Upsert / delete / record payment attempt
   ▼
Convex DB  (real-time subscription pushes to clients)
```

Failure at any step logs the corresponding security event. The handler is idempotent — Svix retries safely.

---

## Deployment topology

### Development

- Local: `localhost:3000` (Next dev) + `npx convex dev` (Convex dev deployment)
- Clerk: dev instance (`pk_test_*`)
- Vercel: none

### Preview (`/deploy-to-dev`)

- URL: `<branch-name>.vercel.app`
- Clerk: same dev instance as local
- Convex: same dev deployment as local
- Visible Clerk dev badge

### Production (`/deploy-to-prod`)

- URL: your custom domain
- Clerk: production instance (`pk_live_*`)
- Convex: prod deployment (separate from dev)
- Stripe: live mode
- Google OAuth with your own credentials
- No Clerk dev badge

See `DEPLOYMENT.md` for the full flow including 2-env vs 3-env setups.

---

## CI pipeline

Runs on every push via GitHub Actions (from upstream SVC-OS):

1. **lint** — ESLint + TypeScript (`tsc --noEmit`)
2. **test** — unit + integration (Vitest)
3. **security** — `npm audit`
4. **build** — production build check

Pre-PR, also run:

- `/security-assessment` (authoritative, via 5 agents)
- `/gstack-review` (structural diff review)
- `/gstack-codex` (cross-model second opinion)
- `/gstack-qa <preview-url>` (browser QA)

---

## What's NOT in this repo (gstack-provided only, user-level)

These live in `~/.claude/skills/gstack/` and are not installed into this repo:

- browse binary (real Chromium for QA)
- design binary (GPT Image API)
- make-pdf binary
- gstack's skill templates

This is deliberate. gstack is a per-developer tool. Each teammate installs it globally (see ONBOARDING.md). No vendoring.

---

## Further reading

- [INTEGRATION.md](INTEGRATION.md) — the contract between SVC-OS and gstack
- [SECURITY.md](SECURITY.md) — security policy + reporting
- [ONBOARDING.md](ONBOARDING.md) — new-dev setup
- [DEPLOYMENT.md](DEPLOYMENT.md) — deploy guide (upstream, unchanged)
- [docs/security/](docs/security/) — deep-dives on each security layer
- [docs/course/](docs/course/) — Secure Vibe Coding Masterclass modules
