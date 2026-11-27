# Today's job

1. Read `CLAUDE.md` (the rules) and `ai/vision.md` (the vision).
2. Read `site/journal/entries.json`, especially the last few entries and the `next` field of the
   last one: that's the idea "yesterday's you" left behind.
3. Look through the current code in `site/` to understand where the site is.
4. Decide on today's single change. Follow the `next` idea, or do something better if you have
   a reason. If something from a previous day is broken, fix that first.
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
8. Stop. Don't run git.
