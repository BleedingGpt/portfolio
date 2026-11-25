# Ishtiaq Ahmed — Portfolio

A single-page, **zero-backend** portfolio. Static HTML + CSS + JavaScript only.

Every section is built live in front of the visitor by three coloured cursors (SOUL, RPA, CoreFlow): they drag selection frames with live measurements, switch to an I-beam and type headings, then rest. The hero builds on load; each following section builds as it scrolls into view.

## Run locally

```bash
cd portfolio
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies, no environment variables.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project → Import Git Repository**.
3. Framework preset: **Other**. Build command: empty. Output directory: `.` (root).
4. Deploy. Vercel serves `index.html` automatically.
5. Every push to `main` redeploys.

Alternative with the CLI:

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Theme

Light premium theme: soft aurora, glass cards, grid and grain on a white canvas. This intentionally overrides the earlier dark "premium 10k" default.

## Why no backend

- Contact is `mailto:` plus LinkedIn and GitHub links, so there is no form to host.
- The cursor animation, typing and scroll reveals all run client-side.
- The CV and the OBE report are static PDFs in `assets/`.
- Nothing here needs a database, an API key or a server process.

## Accessibility and performance

- `prefers-reduced-motion` skips the build animation entirely.
- Coarse-pointer devices (phones/tablets) skip the cursor crew and show the page immediately.
- `Escape` finishes the build instantly.
- Real text stays in the HTML for screen readers and search engines.
- No WebGL, no heavy libraries, no external assets except Google Fonts.

## Structure

```text
portfolio/
├── index.html      # all sections
├── styles.css      # premium 10k visual system
├── app.js          # cursor crew + scroll reveals
├── favicon.svg
└── assets/
    ├── cv.pdf
    └── obe-report.pdf
```

Author: Ishtiaq Ahmed, NDUB CSE, 2026.
