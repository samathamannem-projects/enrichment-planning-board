# Enrichment Planning Board

A planning workspace for the person who builds an elementary school's after‑school
enrichment season. Instead of juggling spreadsheets and email threads, you compose
the whole season on one board: lay classes out across the week, balance the mix of
activities and grade levels, run a vendor sourcing pipeline, and hand off clean,
shareable schedules once things are settled.

Built as a single‑page React app with local persistence — clone it, run it, and the
board saves your season in the browser.

> **Note on sample data:** the app ships seeded with a half‑planned season so every
> view has something to show. Use *Reset to sample season* to restore it, or clear it
> and start your own.

## Why it exists

Enrichment coordinators don't just need a list of classes — they need to *reason about
balance*. Does every day have an art option, a STEM/chess option, and something active?
Are the younger and older grades both covered? Who are the candidate vendors for each
slot, which one is the first choice, and where does each stand on outreach? This tool
treats the season as **one set of class records viewed through several purpose‑built
lenses**, which is the idea the whole design is organized around.

## Features

- **Plan board** — an Activity × Weekday grid (Art, STEM/Chess, Movement, Other by day).
  Empty cells are visible gaps to fill, and coverage dots under each day show at a glance
  whether the core activity types are represented. Drag any class card to a different day
  or activity row to rebalance.
- **Vendor pipeline** — per class, track candidate vendors with a first‑choice ranking,
  an outreach status (to contact → contacted → responded → agreed / declined), preferred
  days, and contact notes. Classes with no vendor yet are surfaced for triage.
- **Season view** — promote settled classes to *Confirmed* and see the locked‑in season
  separated from what's still in planning.
- **Share views** — generate a **Proposed schedule** (draft, for team review) and a
  **Principal roster** (confirmed only), each printable and copyable as text.
- **Local persistence** — the board autosaves to `localStorage`; no account or backend
  required to try it.

## Tech stack

- **React 18** (function components + hooks)
- **Vite** for dev server and build
- **Tailwind CSS** for styling
- **lucide-react** for icons
- **localStorage** for persistence

## Getting started

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# production build + local preview
npm run build
npm run preview
```

## Project structure

```
enrichment-planning-board/
├── index.html              # Vite entry HTML
├── src/
│   ├── main.jsx            # React root
│   ├── index.css          # Tailwind directives
│   └── EnrichmentBoard.jsx # the whole app: data model, views, persistence
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── package.json
```

## Architecture notes

- **One data model, many views.** State is a single `{ classes: [...] }` object. Each
  class carries its type, grade band, day/time/room, a status (`idea` / `proposed` /
  `confirmed`), and an ordered list of candidate vendors (index 0 = first choice). Every
  view — Plan, Vendors, Season, Share — is a projection of that same list, so edits made
  in one place are consistent everywhere.
- **The layout encodes the goal.** The Plan board is an Activity × Day grid specifically
  so that "each day needs an art, a STEM, and a movement class" shows up as an empty cell
  rather than living in a separate checklist.
- **State management** is intentionally kept to React hooks with a `localStorage`
  read on init and a write on every change — small enough to stay readable, and an easy
  seam to swap for a real backend later.

## Roadmap

Natural next steps if this grew beyond a single planner:

- A backend + auth so a few staff can share and co‑edit one season in real time
- Sending the proposed schedule / roster by email directly from the app
- Multiple seasons / terms and archiving
- A dedicated drag‑and‑drop library for richer reordering and keyboard accessibility
- Unit tests around the coverage and vendor‑ranking logic

## License

MIT — see [LICENSE](./LICENSE).
