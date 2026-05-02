# The Vitals Ledger

A personal health accountability site, kept openly and witnessed by friends.

A daily broadsheet you publish about your own body — workouts, sleep, mood,
weight, mindfulness, and the occasional plainly-admitted failure. Editorial
almanac aesthetic: cream paper, deep ink, oxblood accent, set in Fraunces and
EB Garamond.

## Run it

It's a single static HTML file. Open it directly:

```
open index.html
```

Or serve it with anything:

```
python3 -m http.server 8000
```

## Where the data lives

Two sources, merged at render time:

- **`localStorage`** — manual entries (workouts, mood, weight, failures, weekly
  columns). Persists per-browser. Wipe with the footer link.
- **`data/oura.json`** — Oura Ring data, refreshed nightly by a GitHub Action
  and committed to the repo. Read-only at the page; new history shows up the
  next time the workflow runs.

## Oura setup (one-time)

1. **Generate a Personal Access Token** at
   <https://cloud.ouraring.com/personal-access-tokens>. Name it something like
   "Vitals Ledger". Copy the token.

2. **Add it as a repo secret.** In GitHub: *Settings → Secrets and variables →
   Actions → New repository secret*. Name `OURA_TOKEN`, value = the token.

3. **Trigger the first sync** manually so you don't have to wait until tomorrow.
   GitHub UI: *Actions → Oura nightly sync → Run workflow*. Or with the CLI:

   ```
   gh workflow run oura-sync.yml
   ```

   Once it completes, `data/oura.json` will be committed to `main` and the page
   will pick it up on the next refresh (no deploy step needed for a static
   site).

The cron runs daily at 11:00 UTC (06:00 ET). Pulls the last 14 days each run,
so the file is small and historical edits in Oura propagate.

## Run a local sync

For testing without committing:

```
OURA_TOKEN=xxxxxxxx node scripts/sync-oura.mjs
```

Writes the same `data/oura.json`. Requires Node 20+ (uses the built-in
`fetch`).

## Roadmap

- [x] Oura nightly sync via GitHub Action
- [ ] Public deploy (Cloudflare Pages or Vercel)
- [ ] One-tap log buttons for recurring class types
- [ ] Per-practice streaks (sleep, workouts, mindfulness)
- [ ] Daily check-in card (mood, energy, intent)
- [ ] TAC class auto-import (from booking confirmation emails)
