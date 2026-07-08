# AGENTS.md

Spendarium agent working rules.

## Project

**Spendarium · 消费星象馆** is a privacy-first personal finance visualization website.

Core idea:

> Let people upload payment records locally and turn everyday spending into a beautiful, detailed, inspectable finance surface.

Primary platform: static web app on GitHub Pages.

## Product Rules

- Do not turn Spendarium into a generic budget app or SaaS landing page.
- Preserve the original Obsidian Ledger direction: dark, black-gold, precise, elegant, data-rich.
- Three.js should serve financial understanding. Keep it as a refined spending field, orbit, terrain, or heat surface, not an abstract space poster.
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
  - `src/components/SpendingField.tsx` for Three.js visualization.
  - `src/components/SpendariumApp.tsx` for app composition.
- Do not reintroduce a giant single-file HTML app.
- Prefer deterministic demo data over bundled real CSV assets.

## UI Rules

- Follow the black-gold Obsidian Ledger visual language unless the user asks to change it.
- Dense financial information is okay, but it must stay readable.
- Avoid nested cards, generic bento grids, decorative blobs, and overdone purple-blue gradients.
- The first screen is the product itself, not a marketing page.
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
