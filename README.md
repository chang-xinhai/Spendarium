# Spendarium

Spendarium is a privacy-first spending analysis webpage for WeChat Pay and Alipay CSV exports.

The product direction is **a local-first finance terrain map**: a quiet macOS-style landing page, a meaningful Three.js spending landscape, and a detailed report workspace after upload.

## What It Does

- Upload WeChat Pay / Alipay CSV exports in the browser.
- Parse and categorize transactions locally.
- Start with a public-facing landing page instead of exposing demo data immediately.
- Turn spending into an interactive Three.js terrain: time is the horizontal axis, categories are rows, and amount becomes height, ridges, and contours.
- Show total income, total spend, savings, daily average, max spend day, category structure, top merchants, spending insights, and transaction details after upload.
- Preserve the useful analysis surfaces: spending heatmap, category breakdown, merchant ranking, monthly trend, daily spend line, and transaction table.
- Export the current view as PNG.
- Export a standalone HTML finance report.
- Keep user data local by default. No account, no backend, no upload.

## Stack

- Astro
- React
- Three.js via `@react-three/fiber`
- `html-to-image` for PNG export
- GitHub Pages deployment via GitHub Actions

## Local Development

```bash
npm install
npm run dev
npm run build
```

## Privacy Model

Spendarium is designed for GitHub Pages and other static hosts.

CSV files are read with the browser File API. The app does not send records to a server. The public repo must not include real payment CSV files.

## Deployment

The repository is configured for GitHub Pages at:

```txt
https://chang-xinhai.github.io/Spendarium/
```

The GitHub Actions workflow builds Astro and uploads `dist/` to Pages.

## Product Notes

This is not meant to compete with full accounting tools. The product point is a beautiful, private, shareable spending atlas:

- more expressive than a spreadsheet;
- safer than uploading bills to a random SaaS;
- easier to use than a hand-built dashboard;
- visually strong enough to feel like a real personal finance object;
- analytical enough that the terrain tells a story instead of acting as decoration.
