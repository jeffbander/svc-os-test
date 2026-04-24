# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses a simple semver-ish versioning scheme (major.minor.patch).

---

## [Unreleased]

### Planned
- First feature built via the `/gstack-office-hours → /gstack-autoplan → /security-assessment → /create-pull-request → /deploy-to-prod` pipeline.

---

## [0.1.0] — 2026-04-24

Initial integration of the secure-vibe-coding-OS template with the gstack workflow layer. This version is the baseline that teammates clone from.

### Added
- Cloned `harperaa/secure-vibe-coding-OS` at depth 1 as the project foundation. Full tech stack, security baseline, and 37 project-local slash commands (`/install`, `/commit`, `/create-pull-request`, `/deploy-to-prod`, `/security-assessment`, `/retrospective`, etc.) inherited.
- gstack workflow layer integration. gstack is installed globally by each developer at `~/.claude/skills/gstack/` with `--prefix` mode so commands appear as `/gstack-*`, eliminating the `/review` name collision with SVC-OS.
- `CLAUDE.md` extended with a "gstack (workflow layer)" section. Encodes the 7 invariants (stack frozen, security files off-limits, SVC-OS owns git/deploy/security, branch rules absolute), lists banned gstack commands (`/gstack-ship`, `/gstack-land-and-deploy`, `/gstack-setup-deploy`), and documents which gstack skills are safe to use in each phase. Upstream CLAUDE.md content preserved verbatim; gstack rules appended.
- `README.md` replaced with a project-specific version that names this as a personal fork, summarizes the stack, links to the doc set, and credits both Dr. Allen Harper (SVC-OS) and Garry Tan (gstack). Upstream README preserved at `docs/UPSTREAM_README.md`.
- `INTEGRATION.md` — contract between SVC-OS and gstack. Command matrix, conflict-resolution rules, typical sprint walkthrough, upstream-sync instructions.
- `ONBOARDING.md` — 30-minute setup for a new developer. Covers bun install, gstack install with `--prefix`, repo clone, `npm install`, `/install`, local dev (Convex + Next), first-feature walkthrough, and a troubleshooting section for the failure modes we already know about.
- `ARCHITECTURE.md` — stack contract with ASCII data-flow diagram, directory layout marking off-limits files, 9-layer security architecture summary, Clerk-webhook flow, deployment topology (dev/preview/prod), and CI pipeline.
- `SECURITY.md` — security policy. Reporting process (primary contact: notifications@providerloop.com, upstream for SVC-OS / gstack issues), baseline controls summary, off-limits file list, in-scope / out-of-scope, incident response checklist.
- `CHANGELOG.md` — this file.
- `upstream` git remote set to `https://github.com/harperaa/secure-vibe-coding-OS.git` so future security fixes can be pulled via `git fetch upstream && git merge upstream/main`.

### Inherited unchanged from SVC-OS
- `middleware.ts`, `lib/security.*`, `lib/validation.*`, `lib/errors.*`, `convex/auth.*`, `next.config.ts`, `.claude/agents/**`, `.claude/skills/security/**` — the security baseline.
- `DEPLOYMENT.md` — phase-1 dev / phase-2 prod deployment flow via `/deploy-to-dev` and `/deploy-to-prod`.
- `.vibesafeignore`, `.env.example`, `components.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `package.json`, `package-lock.json`.
- All of `app/`, `components/`, `convex/`, `hooks/`, `lib/`, `scripts/`, `secure-vibe-kit/`, `public/`, `content/`, `docs/course/`, `docs/security/`, `docs/templates/`.

### For contributors
- First-time install: see [ONBOARDING.md](ONBOARDING.md).
- Contract: see [INTEGRATION.md](INTEGRATION.md).
- Security policy: see [SECURITY.md](SECURITY.md).
- gstack must be installed with `--prefix` to avoid the `/review` collision. `./setup` without the flag will silently break the integration.

---

## Attribution

- Upstream template: [harperaa/secure-vibe-coding-OS](https://github.com/harperaa/secure-vibe-coding-OS) by Dr. Allen Harper — MIT licensed.
- Upstream workflow layer: [garrytan/gstack](https://github.com/garrytan/gstack) by Garry Tan — MIT licensed.
- This repo inherits both licenses.
