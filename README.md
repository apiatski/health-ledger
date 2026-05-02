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

Currently `localStorage` only — entries and weekly columns persist in your
browser. Nothing leaves the page. Wipe with the link in the footer.

## Roadmap

- [ ] Oura nightly sync via GitHub Action
- [ ] Public deploy (Cloudflare Pages or Vercel)
- [ ] One-tap log buttons for recurring class types
- [ ] Per-practice streaks (sleep, workouts, mindfulness)
- [ ] Daily check-in card (mood, energy, intent)
