# Project — Git & CI/CD Conventions

This file is read automatically by Claude Code on every session.

---

## Branch Rules

| Branch       | Purpose                          | How to sync with main        |
|--------------|----------------------------------|------------------------------|
| `main`       | Production — always deployable   | Never rebase or merge into   |
| `testing`    | Shared integration environment   | `/sync-testing-branch` (merge) |
| `feat/name`  | Feature work                     | `/sync-feature-branch` (rebase) |
| `fix/name`   | Bug fixes                        | `/sync-feature-branch` (rebase) |
| `chore/name` | Maintenance                      | `/sync-feature-branch` (rebase) |

**Rules:**
- Always branch from `main` — never from `testing`
- PRs go to `main` only — never merge `testing` into `main`
- 1 reviewer minimum — you cannot approve your own PR
- Never commit secrets or API keys

---

## The 11 Commands

```
/create-feature-branch [purpose]   Start new work from latest main
/commit                            Stage all and commit with strong message
/push                              Push branch to GitHub
/merge-to-testing                  Add feature branch to testing environment
/create-pull-request               Sync with main, open PR via GitHub CLI
/stash-push                        Temporarily save uncommitted changes
/stash-pop                         Restore most recently stashed changes
/sync-feature-branch               Rebase feature branch on latest main
/sync-testing-branch               Merge main into testing (safe for shared branch)
/status                            Plain-English summary of current state
/security-assessment               Run comprehensive security assessment via agents
```

---

## Everyday Workflow

```
/create-feature-branch user-login     ← start
  ... write code ...
/commit                               ← save
/push                                 ← sync to GitHub, get preview URL
  ... test on preview URL ...
/security-assessment                  ← assess before PR
/create-pull-request                  ← open PR for review
```

## When You Need to Step Away Mid-Work

```
/stash-push    ← park your changes
  ... do other things ...
/stash-pop     ← restore and continue
```

## Keeping Branches Current

```
/sync-feature-branch    ← rebase YOUR branch on latest main (personal only)
/sync-testing-branch    ← merge main into testing (shared branch, uses merge)
```

---

## Conventional Commit Format

All commit messages must follow this format:

```
<type>: <short description>

[optional body]
```

Valid types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

---

## CI Pipeline (runs automatically)

1. lint — ESLint + TypeScript
2. test — unit + integration tests
3. security — npm audit
4. build — production build check

---

## Environments

| Environment | Branch    | URL                     |
|-------------|-----------|-------------------------|
| Production  | `main`    | yourapp.com             |
| Testing     | `testing` | testing.yourapp.com     |
| Preview     | any branch| branch-name.vercel.app  |

---

## Project Stack Defaults

Adjust per-project in a local CLAUDE.md override:

```
Node version: 20
Package manager: npm
Test runner: Vitest
Linter: ESLint + Biome
CI: GitHub Actions
Deploy: Vercel
```

---

## Security

Run `/security-assessment` before opening any PR.
The command invokes the security orchestrator agent in `.claude/agents/`
which runs a comprehensive assessment across OWASP Top 10, authentication,
injection risks, secrets exposure, and dependency vulnerabilities.

Security architecture is implemented through specialized skills at .claude/skills/security/:

Implementation Skills (how to build securely):
- security-overview: High-level defense-in-depth architecture and skill directory
- csrf-protection: CSRF protection implementation
- rate-limiting: Rate limiting implementation
- input-validation: Input validation and XSS prevention
- ai-chat-protection: AI chatbot protection and prompt injection prevention
- security-headers: Security headers configuration
- error-handling: Secure error handling
- auth-security: Clerk authentication and authorization
- payment-security: Clerk Billing and Stripe payment security
- dependency-security: Dependency and supply chain security
- security-testing: Testing security features

Awareness Skills (understanding AI code vulnerabilities):
- security-awareness/awareness-overview: Vibe coding security risks overview
- security-awareness/injection-vulnerabilities: SQL injection, command injection, XSS in AI code
- security-awareness/auth-vulnerabilities: Insecure passwords, broken sessions, access control
- security-awareness/information-leakage: Hardcoded secrets, verbose logging
- security-awareness/supply-chain-risks: Vulnerable dependencies, typosquatting
- security-awareness/business-logic-flaws: Race conditions, integer overflow
- security-awareness/resource-exhaustion: Unbounded operations, DoS, cost explosion

---

## Security Reminders

- Never hardcode env vars — use `.env.local` (gitignored) for local dev
- `.env.example` documents required vars without values — keep it updated
- `npm audit` runs in CI but also run locally before a PR if you added packages

---

## Dynamic Lessons Library

IMPORTANT: Before starting any new work, ALWAYS check .claude/skills/lessons/ for relevant past learnings.

- Location: .claude/skills/lessons/*/SKILL.md
- Created by: /retrospective command after completing work
- Discovery: Use /advise command to search lessons OR manually scan folder for relevant topics

How to use lessons:
1. BEFORE starting work: Check if similar work was done before by scanning .claude/skills/lessons/
2. READ relevant lesson SKILL.md files to learn from past successes and failures
3. APPLY exact parameters and approaches that worked
4. AVOID approaches documented in "Failed Attempts" tables
5. AFTER completing work: Run /retrospective to capture YOUR learnings for future sessions

## Urgent

Use npm tsc --noEmit to check types after each major change
Use npx convex dev --once --typecheck=enable 2>&1 | tail -20 to check Convex types

---

## gstack (workflow layer)

gstack is an additive workflow layer installed globally at `~/.claude/skills/gstack/`
with skills exposed as `/gstack-*` commands. It augments — never replaces — the
secure-vibe-coding-OS baseline defined above.

### Invariants (non-negotiable — gstack must respect these)

1. **Tech stack is fixed.** Next.js 15, Convex, Clerk, Clerk Billing, Svix, Tailwind v4,
   shadcn/ui, Vercel, TypeScript strict. gstack must not propose migrating off this stack.
2. **Do not modify security infrastructure without explicit approval.** Files off-limits
   by default: `middleware.ts`, `lib/security.*`, `lib/validation.*`, `lib/errors.*`,
   `convex/auth.*`, `next.config.ts` (CSP/HSTS headers), and any file under
   `.claude/agents/` or `.claude/skills/security/`.
3. **SVC-OS owns git.** Use `/create-feature-branch`, `/commit`, `/push`,
   `/sync-feature-branch`, `/sync-testing-branch`, `/create-pull-request`,
   `/merge-to-testing`. Do NOT call `/gstack-ship` for commits or PRs.
4. **SVC-OS owns deploy.** Use `/deploy-to-dev` and `/deploy-to-prod`. Do NOT call
   `/gstack-land-and-deploy` or `/gstack-setup-deploy`.
5. **SVC-OS owns the authoritative security assessment.** Use `/security-assessment`
   before every PR (runs the 5-agent orchestrator against OWASP + auth + injection +
   secrets + deps). `/gstack-cso` is permitted only as a secondary opinion, never
   a replacement, and its findings must be reconciled against `/security-assessment`.
6. **SVC-OS owns the lessons library.** `.claude/skills/lessons/` is mandatory to
   consult before new work (per this file's "Dynamic Lessons Library" section).
   `/gstack-learn` is a user-level parallel memory — not a substitute.
7. **Branch rules (from above) are absolute.** Never rebase or merge into `main`.
   PRs target `main` only. gstack must detect the base branch via `gh pr view`
   and respect the feature/testing distinction.

### Where gstack adds value (use these freely)

| Phase | Command | Notes |
|-------|---------|-------|
| Think | `/gstack-office-hours` | Six forcing questions. Run before any new feature. |
| Plan | `/gstack-autoplan` | Runs CEO + design + eng + DX reviews sequentially. |
| Plan (individual) | `/gstack-plan-ceo-review`, `/gstack-plan-eng-review`, `/gstack-plan-design-review`, `/gstack-plan-devex-review` | Granular planning skills. |
| Design (system) | `/gstack-design-consultation` | Run once to create `DESIGN.md` documenting color / type / motion / spacing decisions on top of the inherited shadcn tokens. The skill documents decisions; it does NOT rebuild shadcn. |
| Design (explore) | `/gstack-design-shotgun` | Generate variants, iterate visually. |
| Design (implement) | `/gstack-design-html` | Pretext HTML when building a new marketing page or standalone view. |
| Browser QA | `/gstack-qa <url>`, `/gstack-qa-only <url>`, `/gstack-browse`, `/gstack-open-gstack-browser` | Run against Vercel preview URLs (`branch-name.vercel.app`). |
| Auth cookies for QA | `/gstack-setup-browser-cookies` | Imports from your real Chrome so QA can test behind Clerk. |
| Cross-model review | `/gstack-codex` | OpenAI's second opinion on the same diff after `/security-assessment`. |
| Pre-merge diff | `/gstack-review` | Structural code review — SQL safety, trust boundaries, side effects. Run alongside `/security-assessment`, not instead. |
| Post-merge | `/gstack-canary`, `/gstack-benchmark` | Monitor the production deploy; compare page-load / Core Web Vitals across PRs. |
| Debug | `/gstack-investigate` | Iron Law: no fixes without root cause. Auto-freezes edit scope. |
| Safety | `/gstack-careful`, `/gstack-freeze`, `/gstack-guard`, `/gstack-unfreeze` | Use `/gstack-freeze middleware.ts lib/ convex/auth.ts` before touching security-adjacent code. |
| Docs | `/gstack-document-release` | Post-ship doc updates. Respects CLAUDE.md as authoritative. |
| Retro (gstack-side) | `/gstack-retro` | Weekly engineering retro. Runs IN ADDITION TO `/retrospective`, which remains the primary lesson-capture mechanism. |

### Browser tooling

- Use `/gstack-browse` (from gstack) for all web browsing.
- Never use `mcp__claude-in-chrome__*` tools.

### Typical sprint on this project

```
/gstack-office-hours              ← interrogate the idea
/gstack-autoplan                  ← CEO + design + eng + DX review of the plan
  (approve plan, exit plan mode)
  ... implement ...
/create-feature-branch feat-x     ← SVC-OS: git (respects branch rules)
/commit                           ← SVC-OS: conventional-commit format
/push                             ← SVC-OS: push, get Vercel preview URL
/gstack-qa <preview-url>          ← gstack: real-browser QA
/gstack-codex                     ← gstack: OpenAI second opinion on diff
/security-assessment              ← SVC-OS: authoritative 5-agent security audit
/create-pull-request              ← SVC-OS: opens PR with all checks
  (PR approved + merged)
/deploy-to-prod                   ← SVC-OS: prod deploy
/gstack-canary <prod-url>         ← gstack: watch for regressions
/gstack-document-release          ← gstack: sync docs to what shipped
/retrospective                    ← SVC-OS: capture lesson to .claude/skills/lessons/
```

### Commands that must NOT be used on this project

- `/gstack-ship` — conflicts with SVC-OS branch rules and `/create-pull-request`.
- `/gstack-land-and-deploy` — conflicts with `/deploy-to-prod`.
- `/gstack-setup-deploy` — SVC-OS already owns deploy configuration.

### Design workflow

shadcn does NOT block gstack's design skills. shadcn provides primitives; gstack's design skills document decisions + audit execution. Both are welcome here.

**Bootstrap (once per project):** `/gstack-design-consultation` → creates `DESIGN.md` at repo root. Commit it.

**Per feature with UI:**
1. `/gstack-plan-design-review` — 7-dimension plan audit (IA, interaction states, journey, AI slop, DESIGN.md alignment, responsive/a11y, unresolved decisions). Edits the plan with specifics.
2. Optional: `/gstack-design-shotgun` → AI mockup variants, pick, iterate.
3. Optional: `/gstack-design-html` → choose **React output**. Pretext handles text layout. Output is a REFERENCE, not a drop-in — rebuild with shadcn primitives for consistency.
4. Implement with composed shadcn primitives, using `DESIGN.md` tokens.
5. After Vercel preview URL: `/gstack-design-review https://<branch>.vercel.app` → audits the live site, commits atomic fixes.

**Design rules:**
- Tokens live in `app/globals.css` (OKLCH). Change tokens there, never per-component.
- shadcn primitives in `components/ui/` are editable — they're in the repo, not an npm dep.
- New primitives via `npx shadcn@latest add <component>`.
- Dark mode via `next-themes`; every design decision must work in both modes.
- Prefer `motion/react` over `framer-motion` for new work.

See `INTEGRATION.md#design-sub-workflow` for the full rationale and `DESIGN.md` (once created) for the current palette / type / motion decisions.
