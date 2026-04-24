# svc-os-test

Personal SaaS starter combining **[secure-vibe-coding-OS](https://github.com/harperaa/secure-vibe-coding-OS)** (by Dr. Allen Harper) as the security + stack baseline with **[gstack](https://github.com/garrytan/gstack)** (by Garry Tan) as the workflow layer.

**One sentence:** SVC-OS ships the secure foundation (Next.js 15 + Convex + Clerk + CSRF/CSP/rate-limiting). gstack ships the sprint process (think → plan → review → QA → ship) via 40+ `/gstack-*` slash commands. This repo glues them together and documents the rules that keep the security baseline intact.

---

## Stack

| Layer | Tech | Source |
|---|---|---|
| Framework | Next.js 15 (App Router, Turbopack) | SVC-OS |
| Styling | Tailwind v4 + shadcn/ui + Radix | SVC-OS |
| Database / backend | Convex (real-time, serverless) | SVC-OS |
| Auth + billing | Clerk + Clerk Billing + Svix | SVC-OS |
| Deploy | Vercel | SVC-OS |
| Language | TypeScript (strict) | SVC-OS |
| Workflow | `/gstack-*` slash commands in Claude Code | gstack |
| Process | `/office-hours → /autoplan → /review → /qa → /ship` | gstack |
| Git / deploy commands | `/create-feature-branch`, `/commit`, `/push`, `/deploy-to-*` | SVC-OS |

**Invariant:** Tech stack is frozen. Do not migrate off Next.js / Convex / Clerk / Vercel. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full contract.

---

## Quick start

```bash
git clone git@github.com:jeffbander/svc-os-test.git
cd svc-os-test
npm install
claude                    # opens Claude Code in this directory
# then, inside Claude Code:
/install                  # SVC-OS's guided setup (Clerk + Convex)
npm run dev               # local at http://localhost:3000
```

Full step-by-step: **[ONBOARDING.md](ONBOARDING.md)**.

---

## Documentation map

| Doc | What's in it |
|---|---|
| **[ONBOARDING.md](ONBOARDING.md)** | 30-minute new-dev setup. Install bun + gstack + Claude Code, clone, run `/install`, ship a first change. |
| **[INTEGRATION.md](INTEGRATION.md)** | How SVC-OS and gstack divide responsibilities. Command matrix, 7 invariants, typical sprint, commands that must NOT be used. Read this on day one. |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Stack contract, directory layout, security architecture (CSRF / CSP / rate limiting / Zod), off-limits files, data flow. Reference when deciding what to touch. |
| **[SECURITY.md](SECURITY.md)** | Security policy. Baseline controls inherited from SVC-OS. Reporting process. |
| **[CHANGELOG.md](CHANGELOG.md)** | What changed per version. |
| **[CLAUDE.md](CLAUDE.md)** | Loaded by Claude Code every session. Encodes SVC-OS's git + security rules and the gstack integration invariants. Do not edit without reading it end-to-end. |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Upstream SVC-OS deployment guide. Phase 1 (dev) / Phase 2 (prod) flow via `/deploy-to-dev` and `/deploy-to-prod`. Unchanged from upstream. |
| **[docs/UPSTREAM_README.md](docs/UPSTREAM_README.md)** | Original SVC-OS README preserved for reference. Features list, demo links, course context. |
| **[docs/security/](docs/security/)**, **[docs/course/](docs/course/)** | SVC-OS's security + course modules. Unchanged from upstream. |

---

## Using this repo

### On a new feature
1. `/gstack-office-hours` — interrogate the idea before writing code.
2. `/gstack-autoplan` — plan gets CEO + design + eng + DX review.
3. Implement (after plan approval).
4. `/create-feature-branch feat-x` — SVC-OS owns git, respects branch rules.
5. `/commit && /push` — SVC-OS conventional-commit + push.
6. `/gstack-qa https://<branch>.vercel.app` — real-browser QA against the Vercel preview.
7. `/gstack-codex` — OpenAI's second opinion on the diff.
8. `/security-assessment` — SVC-OS's 5-agent security orchestrator. **Authoritative.**
9. `/create-pull-request` — opens PR.
10. After merge: `/deploy-to-prod`, then `/gstack-canary` to watch prod.

### Commands that must NOT be used here
- `/gstack-ship` — conflicts with SVC-OS branch rules.
- `/gstack-land-and-deploy` — conflicts with `/deploy-to-prod`.
- `/gstack-setup-deploy` — SVC-OS already owns deploy config.

See [INTEGRATION.md](INTEGRATION.md) for the full command matrix and conflict-resolution rules.

---

## Staying in sync with upstream SVC-OS

The upstream template (`harperaa/secure-vibe-coding-OS`) ships security fixes and feature updates. This repo keeps it as a git remote called `upstream`:

```bash
git fetch upstream
git log HEAD..upstream/main --oneline            # see what's new upstream
git merge upstream/main                          # pull in changes
# resolve conflicts, re-run /security-assessment, PR
```

Never force-push over upstream changes. Review them, merge cleanly, run the full security assessment, then land.

---

## Credits

- **[Dr. Allen Harper](https://allenharper.com)** — secure-vibe-coding-OS template + [Secure Vibe Coding Masterclass](https://allenharper.com). All security architecture and stack decisions are his.
- **[Garry Tan](https://github.com/garrytan/gstack)** — gstack workflow layer. All `/gstack-*` commands and the sprint process are his.

This repo is the integration glue and the docs that keep the two systems from stepping on each other. Both upstream projects are MIT-licensed; this repo inherits that license.

---

## License

MIT. See upstream SVC-OS for the original license file.
