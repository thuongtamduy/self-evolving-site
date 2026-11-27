# 🌱 Self-evolving site

A website that grows by itself. Every morning at 08:07 Vietnam time, GitHub Actions wakes Claude up.
Claude reads the vision, its own journal and the source code, **decides on its own** what to change,
writes the code, checks it, and writes a journal entry in English and Vietnamese.
The pipeline takes a time-lapse picture, commits, and Cloudflare Pages deploys.

Nobody tells it what to do.

```
GitHub Actions (cron, every morning)
  └─ Claude Code (runs on a Claude subscription)
       reads ai/vision.md + journal + code → decides → edits site/ → npm run check
  └─ guard.mjs       reverts anything outside the allowed area, normalizes the journal
  └─ check.mjs       opens every page in real Chrome (desktop/EN + mobile/VI): JS errors,
                     broken links, external resources, size, overflow, both languages present
  └─ screenshot.mjs  pictures the home page for the time-lapse
  └─ git push   →    Cloudflare Pages deploys to *.pages.dev
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

### 1. Claude token
On your own machine, install Claude Code (https://code.claude.com) and run:

```bash
claude setup-token
```

Copy the token it prints.

### 2. Repository settings
- **Settings → Secrets and variables → Actions → New repository secret**
  - Name: `CLAUDE_CODE_OAUTH_TOKEN`
  - Secret: the token
- **Settings → Actions → General → Workflow permissions** → **Read and write permissions** → Save

### 3. Cloudflare Pages
1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**
   (may be labelled "Import an existing Git repository").
2. Give Cloudflare access to this repository and select it.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(empty)*
   - Build output directory: **`site`**
4. **Save and Deploy**. You get `https://<project>.pages.dev`; every push to `main` redeploys.

### 4. First day
**Actions → Daily evolution → Run workflow**. After 5–15 minutes, open `/journal/` to read what the AI decided.

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
