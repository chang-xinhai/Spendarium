# AGENTS.md

Spendarium agent working rules.

## Project

**Spendarium** is a privacy-first personal finance visualization website.

Core idea:

> Let people upload payment records locally and turn everyday spending into a beautiful, detailed, inspectable finance terrain.

Primary platform: static web app on GitHub Pages.

## Product Rules

- Do not turn Spendarium into a generic budget app or SaaS landing page.
- The first screen is a refined product landing page: quiet, macOS-like, white/ivory, spacious, and title-led.
- Do not expose demo data as the first screen. Demo data belongs behind the sample action or inside a product preview.
- Preserve original useful modules by default: summary cards, spending heatmap, category breakdown, merchant ranking, monthly trend, daily line, and transaction table.
- Three.js is the signature visualization. It must serve financial understanding: time maps to the horizontal axis, categories map to terrain rows, and spending amount maps to height, ridges, colors, and contour lines.
- Keep the detailed dashboard after upload. The terrain introduces the report; the heatmap, category, merchant, trend, daily line, and table make it inspectable.
- Never commit real payment records, personal CSV files, secrets, access tokens, or screenshots that reveal private transactions.
- Data stays local by default. Do not add a backend or analytics tracker unless explicitly requested.
- Exports should offer a privacy mask for merchant names.

## Engineering Rules

- Use Astro + React + TypeScript.
- Keep browser-only logic in React components and `src/lib`.
- Keep files focused:
  - `src/lib/parser.ts` for CSV decoding/parsing.
  - `src/lib/finance.ts` for finance summaries and insights.
  - `src/lib/categories.ts` for category rules.
  - `src/lib/exportReport.ts` for report export.
  - `src/components/TerrainMap.tsx` for Three.js visualization.
  - `src/components/SpendariumApp.tsx` for app composition.
- Do not reintroduce a giant single-file HTML app.
- Prefer deterministic demo data over bundled real CSV assets.
- When improving layout, fix robustness and responsiveness without changing the product content model unless explicitly requested.

## UI Rules

- Follow the current macOS-style visual language unless the user asks to change it: ivory background, black typography, restrained green/sand accents, precise app-window details.
- Dense financial information is okay, but it must stay readable.
- Avoid nested cards, generic bento grids, decorative blobs, and overdone purple-blue gradients.
- The first screen is a strong product landing page, not the full demo dashboard.
- Use icon-led controls for upload, export, privacy, and navigation.
- Check desktop and mobile layout before calling UI work done.

## Commands

Use these from the repo root:

```bash
npm run dev
npm run build
npm run preview
```

## Git

Commit coherent slices with Conventional Commits:

- `feat: add cashflow field`
- `fix: repair alipay parser`
- `docs: describe privacy model`
- `chore: configure pages deploy`

Before commit:

```bash
npm run build
git status --short
```

## Deployment

GitHub Pages is the default deploy target. The Astro config uses:

```txt
site: https://chang-xinhai.github.io
base: /Spendarium
```

If the repo name changes, update `astro.config.mjs` and this file.
