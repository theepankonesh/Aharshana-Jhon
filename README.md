<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Eternal Bloom — Aharshana & Jhon's Wedding

A luxury, anime-inspired interactive wedding invitation site (Vite + React +
Tailwind), with RSVP and guest-wishes forms powered by [Formspree](https://formspree.io).

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set `VITE_FORMSPREE_ID` (see below).
3. Run the app:
   `npm run dev`

## Forms (Formspree)

The RSVP and Wishes forms both submit to a single Formspree form, tagged with a
hidden `type` field (`"RSVP"` or `"Wish"`).

1. Create a free form at <https://formspree.io>.
2. Copy the ID from your endpoint URL — `https://formspree.io/f/XXXXXXXX` → the
   `XXXXXXXX` part.
3. Set it as `VITE_FORMSPREE_ID` locally (`.env.local`) and in Vercel.

Submissions land in your Formspree dashboard. The "Words of Love" wall is
**curated**: edit the `SEED_WISHES` array in `src/App.tsx` to display your
favourite wishes on the page.

## Deploy to Vercel

This is a static Vite SPA — no server is required (`server.ts`/`db.json` are
leftovers from local development and are not used in production).

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project** and import the repo. Vercel auto-detects
   Vite via `vercel.json` (build: `vite build`, output: `dist`).
3. Add the environment variable **`VITE_FORMSPREE_ID`** under
   **Settings → Environment Variables**.
4. Deploy. SPA deep links are handled by the rewrite rule in `vercel.json`.

To deploy from the CLI instead: `npx vercel` (preview) / `npx vercel --prod`.

## Assets

- Hero / gallery photos: drop into `public/images/` as `WED.jpg` and
  `gallery-1.jpg … gallery-8.jpg`.
- Background music: `public/music/romance.mp3` and `romance.ogg`.
