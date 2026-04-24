# INTEGRATION.md — how SVC-OS and gstack combine

This document is the contract between two systems that live in the same repo:

- **secure-vibe-coding-OS (SVC-OS)** — a project template cloned into this repo. Provides the tech stack, the security baseline (code + CLAUDE.md rules), 37 project-local slash commands in `.claude/commands/`, and 5 security agents in `.claude/agents/`.
- **gstack** — a user-level skill pack installed globally at `~/.claude/skills/gstack/`. Provides 40+ workflow commands exposed as `/gstack-*` (prefix mode). Tech-agnostic. Adds the sprint process (think → plan → review → QA → ship) that SVC-OS doesn't include.

The two are complementary. This doc tells you which one owns each phase, what happens when they disagree, and which commands are banned.

Read this end-to-end once. It will save you from accidentally deploying with the wrong command or "fixing" a security file.

---

## The 7 invariants (non-negotiable)

These are mirrored in `CLAUDE.md` — Claude Code loads them every session.

1. **Tech stack is frozen.** Next.js 15 + App Router + Turbopack, Convex, Clerk + Clerk Billing + Svix, Tailwind v4, shadcn/ui + Radix, TypeScript strict, Vercel. No migrations off this stack without an explicit decision logged in this doc or the CHANGELOG.
2. **Security infrastructure is off-limits by default.** Files you do NOT touch without an explicit approval pass:
   - `middleware.ts`
   - `lib/security.*`
   - `lib/validation.*`
   - `lib/errors.*`
   - `convex/auth.*`
   - `next.config.ts` (CSP, HSTS, security headers)
   - `.claude/agents/**`
   - `.claude/skills/security/**`

   When you need to modify one, run `/gstack-freeze` first scoped to just that file, then apply the change, then `/security-assessment` must pass before merge.
3. **SVC-OS owns git.** `/create-feature-branch`, `/commit`, `/push`, `/sync-feature-branch`, `/sync-testing-branch`, `/create-pull-request`, `/merge-to-testing`, `/stash-push`, `/stash-pop`. These know the branch rules (`feat/*` rebases, `testing` merges, never rebase `main`) and the conventional-commit format.
4. **SVC-OS owns deploy.** `/deploy-to-dev`, `/deploy-to-prod`. These know your Vercel + Clerk + Convex topology.
5. **SVC-OS owns the authoritative security assessment.** `/security-assessment` runs the 5-agent orchestrator (`security-orchestrator`, `security-reporter`, `security-scanner`, `security-tracer`, `threat-modeler`) over OWASP Top 10, auth, injection, secrets, and dependency vulns. This is the gate for every PR. `/gstack-cso` is permitted as a second opinion — never as a replacement.
6. **SVC-OS owns the lessons library.** `.claude/skills/lessons/*/SKILL.md` is mandatory to consult before new work (per CLAUDE.md). `/retrospective` captures new lessons there. `/gstack-learn` is a user-level parallel memory that tracks patterns across all your projects — useful, but not a substitute.
7. **Branch rules are absolute.** `main` is always deployable. Never rebase or merge into `main`. PRs target `main` only. Feature branches rebase off `main`; `testing` is the merge branch. You cannot approve your own PR.

---

## Command matrix (who owns what)

| Phase | Owner | Commands |
|---|---|---|
| Think / brainstorm | gstack | `/gstack-office-hours` |
| Plan (full pipeline) | gstack | `/gstack-autoplan` |
| Plan (individual reviews) | gstack | `/gstack-plan-ceo-review`, `/gstack-plan-eng-review`, `/gstack-plan-design-review`, `/gstack-plan-devex-review` |
| Design — system + tokens | gstack | `/gstack-design-consultation` — run once per project to create `DESIGN.md` (brand palette, type scale, motion policy, elevation, density) on top of the inherited shadcn tokens. Skill documents decisions; it does not rebuild shadcn. |
| Design — explore variants | gstack | `/gstack-design-shotgun` |
| Design — implement markup | gstack | `/gstack-design-html` (Pretext) |
| Design — live QA | gstack | `/gstack-design-review` |
| Code — implement | both | Write code normally. Use `/gstack-careful` or `/gstack-guard` if near security files. |
| Code — debug | gstack | `/gstack-investigate` (Iron Law: no fixes without root cause) |
| Code — safety rails | gstack | `/gstack-careful`, `/gstack-freeze <dir>`, `/gstack-guard`, `/gstack-unfreeze` |
| Branch / commit / push | **SVC-OS** | `/create-feature-branch`, `/commit`, `/push`, `/stash-push`, `/stash-pop`, `/sync-feature-branch`, `/sync-testing-branch` |
| Pre-merge code review | both | `/gstack-review` (structural) + `/gstack-codex` (cross-model) + `/security-assessment` (**authoritative**) |
| Browser QA against preview | gstack | `/gstack-qa <url>`, `/gstack-qa-only <url>`, `/gstack-browse`, `/gstack-open-gstack-browser`, `/gstack-setup-browser-cookies` |
| Cross-model second opinion | gstack | `/gstack-codex` (OpenAI Codex) |
| Security audit | **SVC-OS** | `/security-assessment` (mandatory). `/gstack-cso` allowed as secondary. |
| Open PR | **SVC-OS** | `/create-pull-request` |
| Merge to testing branch | **SVC-OS** | `/merge-to-testing` |
| Deploy to dev / preview | **SVC-OS** | `/deploy-to-dev` |
| Deploy to prod | **SVC-OS** | `/deploy-to-prod` |
| Post-deploy monitoring | gstack | `/gstack-canary <prod-url>`, `/gstack-benchmark` |
| Post-ship docs | gstack | `/gstack-document-release` |
| Retro + lesson capture | **SVC-OS** | `/retrospective` (primary). `/gstack-retro` for gstack-side weekly summary. |
| Status / standup | SVC-OS | `/status`, `/standup`, `/branches`, `/log`, `/testing-status`, `/ci-status` |
| Memory / learnings (project) | **SVC-OS** | `.claude/skills/lessons/` — check before every task |
| Memory / learnings (user-level) | gstack | `/gstack-learn` — cross-project patterns |

---

## Commands that must NOT be used on this project

These three gstack commands directly conflict with SVC-OS-owned workflows. They're forbidden:

- ❌ `/gstack-ship` — runs its own PR workflow, conflicts with `/create-pull-request` + branch rules
- ❌ `/gstack-land-and-deploy` — runs its own deploy flow, conflicts with `/deploy-to-prod`
- ❌ `/gstack-setup-deploy` — writes deploy config to CLAUDE.md, conflicts with SVC-OS's existing Vercel setup

If you need the behavior they offer, use the SVC-OS equivalent:

| If you want | Use |
|---|---|
| Open a PR | `/create-pull-request` |
| Deploy to prod | `/deploy-to-prod` |
| Configure deploy | Edit `.env.local` + `vercel.json`, per `DEPLOYMENT.md` |

---

## Typical sprint (the one you'll run most)

```
User: I want to add X.

Claude: /gstack-office-hours                  ← 6 forcing questions
        (claude pushes back on framing, extracts real requirements)

User:   ok, let's plan it.

Claude: /gstack-autoplan                      ← CEO + design + eng + DX review
        (surfaces taste decisions, user approves)

Claude: ... implements feature ...

User:   /create-feature-branch feat-add-x     ← SVC-OS: branch from main
        /commit                                ← SVC-OS: conventional-commit
        /push                                  ← SVC-OS: push, get preview URL
        /gstack-qa https://feat-add-x.vercel.app  ← gstack: browser QA
        /gstack-codex                          ← gstack: OpenAI second opinion
        /security-assessment                   ← SVC-OS: authoritative security
        /create-pull-request                   ← SVC-OS: opens PR

        (PR reviewed, approved, merged)

        /deploy-to-prod                        ← SVC-OS: prod deploy
        /gstack-canary https://yourapp.com     ← gstack: watch prod
        /gstack-document-release               ← gstack: sync docs
        /retrospective                         ← SVC-OS: capture lesson
```

Not every sprint needs every step. Minimums:

- **Tiny bug fix:** `/gstack-investigate` → code → `/commit` → `/push` → `/security-assessment` → `/create-pull-request`
- **UI-only change:** `/gstack-office-hours` → code → `/gstack-qa preview-url` → `/gstack-design-review` → commit/push/PR
- **Security-adjacent change:** `/gstack-freeze <scope>` → code → `/gstack-codex` → `/security-assessment` → commit/push/PR. Mandatory.

---

## Design sub-workflow

The five gstack design skills compose cleanly with shadcn + Tailwind. None of them rip out the component library; each fills a specific gap.

**One-time bootstrap (per project):**

1. `/gstack-design-consultation` — creates `DESIGN.md` at repo root. Documents brand palette, type scale, motion philosophy, spacing/elevation/radius decisions. Reads the existing shadcn tokens in `app/globals.css` and builds decisions on top of them. The skill is interactive; answer honestly about brand direction, competitors, and vibe. Commit `DESIGN.md` to the repo so the whole team shares one design source of truth.

**Per feature with UI:**

1. `/gstack-plan-design-review` on the feature plan — 7 passes scored 0–10 (information architecture, interaction-state coverage, user journey, AI-slop risk, design-system alignment, responsive/a11y, unresolved decisions). Edits the plan to add specifics before any code is written. Reads `DESIGN.md` as the calibration baseline.
2. **Optional:** `/gstack-design-shotgun` if the plan has visual ambiguity. Generates 3–8 AI mockup variants, opens a comparison board, collects feedback, iterates. Output is PNG images in an artifact dir; does not touch the repo.
3. **Optional:** `/gstack-design-html` on the approved mockup. When it asks about output format, choose **React component (`.tsx`)**. The skill detects Next.js and generates a `.tsx` reference. Pretext (30KB, zero deps) handles text layout so the reference actually reflows correctly.
4. Implement the feature using **composed shadcn primitives** from `components/ui/`, guided by the reference. Do not paste `/gstack-design-html`'s output verbatim — rebuild with shadcn components for consistency with the rest of the app. The reference is for layout/spacing/rhythm, not for shipping.
5. After `/push` gives you a Vercel preview, run `/gstack-design-review https://<branch>.vercel.app`. The skill audits the rendered site (never reads source), finds visual issues, commits atomic fixes. Reads `DESIGN.md` as the baseline for "is this on-brand."

**Key design rules for this stack:**

- Design tokens live in `app/globals.css` (OKLCH variables). Changes to tokens propagate to every shadcn component automatically. This is the ONLY place to change colors, radius, or semantic tokens project-wide.
- shadcn primitives in `components/ui/` are yours to edit (they're in the repo, not an npm dep). Customizing a button variant, adding a new size, or tweaking a card layout is allowed and expected.
- `motion/react` + `framer-motion` are both already installed. Prefer `motion/react` for new work (it's the successor). `DESIGN.md` should specify when to animate, not just what library to use.
- Dark mode is managed by `next-themes` via the `.dark` class on `<html>`. All design decisions must work in both modes.
- New component primitives (beyond the 27 shadcn components already present) go in `components/ui/` following shadcn conventions. `npx shadcn@latest add <component>` when the primitive exists upstream.

---

## Conflict resolution

When SVC-OS and gstack reach different conclusions, **SVC-OS wins**. Reasons:

1. SVC-OS knows your stack; gstack is stack-agnostic.
2. SVC-OS's security agents know your threat model; `/gstack-cso` is generic.
3. SVC-OS's branch rules encode team agreements; `/gstack-ship` doesn't know them.

When they agree, both are useful — `/gstack-review` + `/gstack-codex` + `/security-assessment` together catch more than any one.

Disagreement patterns to watch for:

| Pattern | Resolution |
|---|---|
| `/gstack-autoplan` recommends a non-Convex database | Reject. Invariant #1. |
| `/gstack-cso` flags something `/security-assessment` says is fine | Investigate. If SVC-OS agents are correct, close the gstack finding with a note. If gstack is correct, file an issue against SVC-OS upstream. |
| `/gstack-review` recommends refactoring `lib/security.ts` | Block. Invariant #2. Run `/gstack-freeze lib/security.ts` and consider whether the refactor is worth breaking the baseline. |
| `/gstack-plan-ceo-review` recommends swapping Clerk for Auth.js | Reject. Invariant #1. |
| `/gstack-design-consultation` proposes swapping shadcn/Radix for another component library | Reject. Invariant #1. The skill's role here is to document design decisions via `DESIGN.md` on top of the inherited shadcn primitives, not to replace them. Token changes (palette, type, radius) in `app/globals.css` are allowed; ripping out shadcn is not. |

---

## Onboarding a teammate

1. Send them this file + `README.md` + `ONBOARDING.md`.
2. They install gstack globally (not per-repo): `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup --prefix`
3. They clone this repo.
4. They run `/install` inside Claude Code from this repo.
5. First sprint: have them run `/gstack-office-hours` on something small to feel the loop.

Do not run `gstack-team-init required` on this repo. SVC-OS is already a template; adding gstack's team mode on top would duplicate the installation layer.

---

## Syncing security fixes from upstream SVC-OS

When Dr. Allen Harper ships a security fix to `harperaa/secure-vibe-coding-OS`:

```bash
git fetch upstream
git log HEAD..upstream/main --oneline           # review what's new
git merge upstream/main                         # merge, resolve conflicts
/security-assessment                            # must pass
/gstack-cso                                     # optional second opinion
/create-pull-request                            # land via normal PR
```

Never `git reset --hard upstream/main` — you'd lose this repo's `CLAUDE.md` integration block and local work.

---

## Changing the invariants

Invariants change only when:

1. The change is captured in `CHANGELOG.md` with rationale.
2. This doc is updated in the same commit.
3. The PR runs `/security-assessment` AND `/gstack-cso` (both).
4. A human reviewer signs off.

Invariants are the contract. Ad-hoc edits silently break the contract.
