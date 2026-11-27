# Today's job

1. Read `CLAUDE.md` (the rules), `ai/vision.md` (the vision) and `ai/feedback.md` (human feedback).
2. Read `site/journal/entries.json`, especially the last few entries and the `next` field of the
   last one: that's the idea "yesterday's you" left behind.
3. Look through the current code in `site/` to understand where the site is.
4. Decide on today's single change. Priority order:
   1. an **open item in `ai/feedback.md`** (humans asked for it; today's change is to resolve it),
   2. something broken or ugly from a previous day (run `npm run preview` and look first),
   3. the `next` idea, or something better if you have a reason.
5. Make the change, in both English and Vietnamese.
6. Append EXACTLY ONE entry to the end of the array in `site/journal/entries.json`:

```json
{
  "day": 0,
  "date": "",
  "title":   { "en": "Short title of today's change", "vi": "Tiêu đề ngắn" },
  "thought": { "en": "What you thought about today and why you chose this (2–4 natural sentences).", "vi": "..." },
  "change":  { "en": "What exactly you did.", "vi": "..." },
  "files": ["site/..."],
  "next":    { "en": "The idea you want to leave for tomorrow.", "vi": "..." }
}
```
   Leave `day` and `date` as above; the system fills them in.

7. Run `npm run check`. If it fails, fix and run it again until it passes.
8. Run `npm run preview` and open every screenshot in `.preview/` with the Read tool.
   Critique them honestly (layout, spacing, wrapping, contrast, polish) on both desktop and mobile.
   Fix and repeat until it looks genuinely good. Then run `npm run check` once more.
   If you resolved a feedback item, say so in your journal entry.
9. Stop. Don't run git.
