# ONBOARDING.md — 30-minute setup for a new developer

Target: from zero to shipping a first change in 30 minutes.

If anything takes longer than the time estimate, stop and read [Troubleshooting](#troubleshooting) — you're hitting a known issue, not doing it wrong.

---

## Prerequisites

| Tool | Minimum | Check with |
|---|---|---|
| macOS, Linux, or WSL2 | — | `uname -a` |
| Node.js | 20+ (18 works but 20 is the stack default) | `node --version` |
| npm | 10+ | `npm --version` |
| git | any recent | `git --version` |
| GitHub CLI (`gh`) | any recent | `gh --version` |
| Claude Code | latest | `claude --version` |
| bun | 1.3+ (installed during gstack setup if missing) | `bun --version` |

Accounts you'll need to create (free tier is fine to start):

- **Clerk** — auth + billing (`/install` walks you through this)
- **Convex** — real-time database (`/install` walks you through this)
- **Vercel** — deploy (only needed when you run `/deploy-to-dev`)
- **GitHub** — you already have one, you're reading this

---

## Step 1 — Machine setup (5 min, one-time)

### 1a. Install gstack globally

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack
./setup --prefix
```

The `--prefix` flag is **required** — it makes every gstack skill show up as `/gstack-*` and avoids collision with SVC-OS's `/review`, `/commit`, etc.

If `./setup` fails with "bun not found," install bun first:

```bash
curl -fsSL https://bun.sh/install | bash
# then symlink so the current shell picks it up:
mkdir -p ~/.local/bin
ln -sf ~/.bun/bin/bun ~/.local/bin/bun
ln -sf ~/.bun/bin/bunx ~/.local/bin/bunx
```

Verify:

```bash
bun --version                               # should print 1.3.x or newer
ls ~/.claude/skills/ | grep gstack          # should list ~40 gstack-* skills
```

### 1b. Authenticate GitHub CLI (if not already)

```bash
gh auth status || gh auth login
```

### 1c. Restart Claude Code

Claude Code scans skills at session start. Quit and relaunch the app (or run `/clear` in an existing session). The `/gstack-*` commands won't autocomplete until you do.

---

## Step 2 — Clone this repo (1 min)

```bash
cd ~/projects                                # or wherever you keep work
git clone https://github.com/jeffbander/svc-os-test.git
cd svc-os-test
```

(If you have SSH registered with GitHub, `git@github.com:jeffbander/svc-os-test.git` also works. HTTPS is the zero-config default — it reuses your `gh auth` token.)

Then install dependencies:

```bash
npm install
```

`npm install` will take 1–3 minutes. SVC-OS's package tree is not small.

---

## Step 3 — Run `/install` inside Claude Code (10 min)

```bash
claude                                       # opens Claude Code in this dir
```

Then, in Claude Code:

```
/install
```

`/install` is an SVC-OS command that does the Clerk + Convex setup for you. It will:

1. Create a Clerk dev application (you'll get a claim URL via email).
2. Generate `CSRF_SECRET` and `SESSION_SECRET` values.
3. Write `.env.local` with all required env vars.
4. Set up a Convex project interactively.
5. Create the Clerk webhook endpoint pointed at your Convex deployment.
6. Configure Convex dashboard env vars.

Follow the prompts. Answer as `jeffbander` where it asks for a GitHub username.

When it finishes, verify:

```bash
cat .env.local | grep -v SECRET | grep -v KEY    # should show Convex + Clerk URLs
```

Do NOT commit `.env.local`. It's gitignored by default — keep it that way.

---

## Step 4 — Run the app locally (2 min)

SVC-OS needs two terminals during development — one for Convex (backend), one for Next.js (frontend):

**Terminal 1** — Convex dev server:
```bash
npx convex dev
```

Leave this running. It watches `convex/` and redeploys on save.

**Terminal 2** — Next.js dev server:
```bash
npm run dev
```

Open http://localhost:3000. You should see the SVC-OS landing page. Sign up with Clerk (dev mode — any email). Visit `/dashboard` to confirm auth works.

---

## Step 5 — Verify the security baseline (3 min)

Still inside Claude Code, run:

```
/security-assessment
```

This runs the 5-agent security orchestrator. First run on a fresh clone should pass cleanly — if it flags anything, screenshot the output and post to the repo issues before going further. This is the baseline you're committing to preserve.

Then run gstack's secondary-opinion scan:

```
/gstack-cso
```

Compare the two. They should largely agree. Where they disagree, SVC-OS wins (per [INTEGRATION.md](INTEGRATION.md)).

---

## Step 6 — Your first feature (15 min)

Pick something tiny. A copy tweak. A new dashboard card. A color. Don't pick auth, middleware, or anything in the [off-limits file list](INTEGRATION.md#the-7-invariants-non-negotiable).

Inside Claude Code:

```
/gstack-office-hours
```

Tell it what you want. It will push back with 6 forcing questions. Answer honestly — this saves you from shipping the wrong thing.

```
/gstack-autoplan
```

Let it run. It'll produce a plan that's been through CEO + design + eng + DX review. Approve or adjust.

Exit plan mode. Let Claude implement. Watch the changes — they should touch only files you expect.

Then:

```
/create-feature-branch feat-my-first-change
/commit
/push
```

Copy the Vercel preview URL from the `/push` output. Then:

```
/gstack-qa https://feat-my-first-change-*.vercel.app
```

(Use the actual preview URL.) gstack will spin up a real Chromium, click through your change, find bugs, and try to fix them.

Then the security lap:

```
/gstack-codex
/security-assessment
```

If both pass:

```
/create-pull-request
```

That's your first feature. Total time should be 15 min for something trivial, 30–60 for something non-trivial.

---

## Troubleshooting

### `git clone git@github.com:...` → Permission denied (publickey)
You don't have an SSH key registered with GitHub, but `gh` is authed over HTTPS. Use the HTTPS clone URL instead:
```bash
git clone https://github.com/jeffbander/svc-os-test.git
```
To set up SSH later (optional): `ssh-keygen -t ed25519 -C "your-email@example.com"` then `gh ssh-key add ~/.ssh/id_ed25519.pub --title "$(hostname)"` and verify with `ssh -T git@github.com`.

### Pasted a block that ended in `#` and zsh shows `quote>`
Zsh entered quoted-string continuation mode because something in the paste looked unclosed. Press `Ctrl+C` to escape, then paste individual lines without trailing `#` comments, or wrap the whole paste in a heredoc.

### `/install` asks me to paste env vars I've never seen
Open the Clerk dashboard, click the app it created, grab `Publishable key` and `Secret key`. They're under API Keys.

### Convex dev says "Cannot find project"
Run `npx convex dev --configure` once, pick "Create new project," and re-run `npx convex dev`.

### `/gstack-*` commands don't autocomplete in Claude Code
You didn't restart Claude Code after running `./setup --prefix`. Quit the app completely and reopen it.

### `bun` command not found even after install
bun installed to `~/.bun/bin` and added itself to `~/.zshrc`, but the current shell hasn't re-sourced it. Open a new terminal tab OR symlink into `~/.local/bin` (instructions in Step 1a).

### `/security-assessment` fails on a fresh clone
This should not happen. If it does, do NOT start making changes. Open an issue on this repo with the full output, and cross-check against upstream SVC-OS (`gh repo view harperaa/secure-vibe-coding-OS --web`) to see if there's an active incident.

### Vercel preview URL is wrong / missing after `/push`
You haven't connected Vercel to this repo yet. Run `npx vercel` once and follow the link flow. Next `/push` will produce a preview URL.

### I accidentally ran `/gstack-ship`
Stop. Don't merge anything it opened. That command conflicts with SVC-OS's branch rules. Close any PR it created, delete any branch it pushed to remote, and use `/create-pull-request` instead.

### The sidebar agent tries to modify `middleware.ts`
Say no. That file is off-limits per invariant #2. If you believe the change is correct, run `/gstack-freeze middleware.ts` first, make the change deliberately, then run the full security gate before merging.

### My Claude Code session can't see the gstack skills at all
Run `ls ~/.claude/skills/ | head`. If you don't see `gstack-*` entries, `./setup --prefix` didn't complete. Re-run it.

### `git status` shows files I never touched
Common with compiled binaries in some gstack versions — ignore `browse/dist/` and `design/dist/` under `~/.claude/skills/gstack/`. In THIS repo, everything committed should be source.

---

## Glossary

| Term | Meaning |
|---|---|
| **SVC-OS** | secure-vibe-coding-OS — the upstream template by Dr. Allen Harper. Provides stack + security baseline. |
| **gstack** | the workflow skill pack by Garry Tan. Provides the sprint process. |
| **`/command`** | slash command in Claude Code. SVC-OS commands have no prefix; gstack commands are `/gstack-*`. |
| **Invariant** | a non-negotiable rule documented in `CLAUDE.md` and `INTEGRATION.md`. Changing one requires a signed-off PR. |
| **Preview URL** | Vercel's branch-specific URL (`branch-name.vercel.app`) generated on every `/push`. |
| **Lessons library** | `.claude/skills/lessons/` — past learnings captured by `/retrospective`. Read before every task per CLAUDE.md. |

---

## Next steps

- Read [INTEGRATION.md](INTEGRATION.md) end-to-end. It's the contract.
- Skim [ARCHITECTURE.md](ARCHITECTURE.md). You don't need to memorize it, but know where to look.
- Add yourself to `CHANGELOG.md` when you ship.
