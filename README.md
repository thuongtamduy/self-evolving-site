# 🐣 Self-evolving site: a virtual pet raised by an AI

A tiny virtual pet for your phone that grows by itself. It starts as an egg. Every morning at 08:07
Vietnam time, GitHub Actions wakes Claude up. Claude reads the vision, human feedback, its own journal
and the source code, **decides on its own** what to teach the pet next,
writes the code, checks it, and writes a journal entry in English and Vietnamese.
The pipeline takes a time-lapse picture, commits, and deploys to Cloudflare Pages with Wrangler.

Nobody tells it what to do.

```
GitHub Actions (cron, every morning)
  └─ Claude Code (runs on a Claude subscription)
       reads ai/vision.md + journal + code → decides → edits site/ → npm run check
  └─ guard.mjs       reverts anything outside the allowed area, normalizes the journal
  └─ check.mjs       opens every page in real Chrome (desktop/EN + mobile/VI): JS errors,
                     broken links, external resources, size, overflow, both languages present
  └─ screenshot.mjs  pictures the home page for the time-lapse
  └─ git push
  └─ deploy.sh       wrangler pages deploy → *.pages.dev (creates the project on first run)
```

If any step fails, **nothing is published** that day and the live site stays as it was.

## Layout

| Path | Edited by | Purpose |
|---|---|---|
| `ai/vision.md` | **You** | Vision and personality. Edit it to steer the AI |
| `ai/daily-prompt.md` | You | What the AI does each day |
| `CLAUDE.md` | You | The rules (Claude Code reads this automatically) |
| `site/` | **AI** | The actual website |
| `site/journal/entries.json` | AI (append-only) | The journal: the AI's memory |
| `site/i18n.*`, `site/journal/*.html/js/css`, `site/timelapse/`, `site/_headers` | System | Off-limits to the AI |
| `scripts/` | System | Guard, checks, screenshots |

### Bilingual (EN / VI)
`site/i18n.js` adds a language switch to every page and remembers the choice.
Static text is written twice, `<span data-l="en">…</span><span data-l="vi">…</span>`, and text
built in JavaScript uses `i18n.t({ en, vi })`. The check fails if a page doesn't load the language
system or if a journal entry is missing either language.

### Security
`site/_headers` sets a `default-src 'self'` Content-Security-Policy on Cloudflare, so the site
cannot load anything from outside, even if the AI tries to.

---

## Setup

Everything is automated except adding secrets. Under **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret | Where to get it |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Run `claude setup-token` on your machine (install Claude Code from https://code.claude.com) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create token, with **Account → Cloudflare Pages → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → the account ID shown on the account home / Workers & Pages overview |

Then:
1. **Actions → Deploy → Run workflow.** This creates the Cloudflare Pages project `growsdaily`
   on the first run and publishes Day 0. The URL is printed at the end of the log
   (`https://growsdaily.pages.dev`).
2. **Actions → Daily evolution → Run workflow.** The first day of evolution. After 5–15 minutes,
   open `/journal/` to read what the AI decided. From then on it runs every morning by itself.

To use a different Pages project name, change `PAGES_PROJECT` (default `growsdaily`) in `scripts/deploy.sh`.

If the push step fails with a permission error, set **Settings → Actions → General → Workflow permissions**
to **Read and write permissions**.

### How deploys happen
- The daily evolution deploys at the end of its own run.
- `Deploy` runs whenever a human pushes changes under `site/` to `main`, or on demand.
- If the Cloudflare secrets are missing, deploys are skipped with a warning instead of failing.

---

## Controls

- **Steer**: edit `ai/vision.md` (e.g. "this site is a digital garden", "add a small game every week").
- **Schedule**: the `cron` line in `.github/workflows/evolve.yml` (UTC; Vietnam is UTC+7).
- **Pause**: Actions → Daily evolution → `···` → **Disable workflow**.
- **Roll back**: every day is one commit, so `git revert <commit>` and push.
- **Effort cap**: `--max-turns` in the workflow (default 60).

## Run the checks locally

```bash
npm ci
npx playwright install chromium
npm run check
```

## Notes
- Each run counts against the usage limits of the Claude plan that issued the token.
- The token belongs to whoever ran `claude setup-token`. If it expires or the plan changes, create a new one and update the secret.
- GitHub disables schedules in public repositories after 60 days without activity. Daily commits keep it alive, but keep an eye on it after a streak of failed days.
- Scheduled runs are attributed to whoever last edited the `cron` line; that must be a human account, not a bot.
