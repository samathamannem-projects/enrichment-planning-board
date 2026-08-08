# Enrichment Planning Board

A planning workspace for the person who builds an elementary school's after‑school
enrichment season. Instead of juggling spreadsheets and email threads, you compose
the whole season on one board: lay classes out across the week, balance the mix of
activities and grade levels, run a vendor sourcing pipeline, and hand off clean,
shareable schedules once things are settled.

Built as a single‑page React app with local persistence — clone it, run it, and the
board saves your season in the browser.

> **Seeded with real data:** the app opens with three completed seasons (Fall 2025,
> Winter 2026, Spring 2026 — 51 classes) imported from Homeroom exports as read-only
> historical boards, plus an empty, editable current season to plan the next one.

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
- **Multiple seasons** — a season switcher moves between past terms and the current one.
  Past seasons are **read-only historical boards** showing what actually ran — category,
  grades, room, instructor, vendor, final enrollment, and Completed/Cancelled outcome —
  with summary stats (seats filled, cancellations). The current season is fully editable.
- **Cloud sync + staff login** — with a Supabase project configured, the current season
  is stored in Postgres and gated behind a passwordless email (magic-link) login, so a few
  staff can view and edit the same season from any device. Historical seasons stay open to
  view without signing in.
- **Local-first fallback** — with no backend configured, the app autosaves the current
  season to `localStorage` and runs with no login, so it works out of the box.

## Tech stack

- **React 18** (function components + hooks)
- **Vite** for dev server and build
- **Tailwind CSS** for styling
- **lucide-react** for icons
- **Supabase** (Postgres + passwordless auth) for cloud sync, with a `localStorage` fallback

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
- Creating and duplicating new seasons from within the app (historical view already ships)
- Importing a Homeroom CSV directly in the browser to spin up a new historical season
- A dedicated drag‑and‑drop library for richer reordering and keyboard accessibility
- Unit tests around the coverage and vendor‑ranking logic

## Cloud sync setup (optional)

The app runs with no backend (local storage, no login). To enable multi-device sync with a
staff login, create a free [Supabase](https://supabase.com) project and:

1. In the SQL editor, create the table and access policies:

   ```sql
   create table if not exists board_state (
     id text primary key,
     data jsonb not null default '{}'::jsonb,
     updated_at timestamptz not null default now()
   );
   alter table board_state enable row level security;
   create policy "authenticated read"   on board_state for select to authenticated using (true);
   create policy "authenticated insert" on board_state for insert to authenticated with check (true);
   create policy "authenticated update" on board_state for update to authenticated using (true) with check (true);
   ```

2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from Project Settings → API) as
   environment variables in your host (e.g. Vercel), then redeploy. See `.env.example`.

3. In Supabase Auth, set the Site URL to your deployed URL, disable open sign-ups, and invite
   your staff by email so only they can sign in.

The anon key is a publishable client key by design — access is enforced by Row Level Security
and auth, not by hiding it.

## License

MIT — see [LICENSE](./LICENSE).
