# Spendarium · 消费星象馆

Spendarium is a privacy-first spending analysis webpage for WeChat Pay and Alipay CSV exports.

The product direction is **Obsidian Ledger, rebuilt as a public web app**: keep the original black-gold financial dashboard, keep the useful analysis modules, and make the implementation more robust than the previous single-file HTML prototype.

## What It Does

- Upload WeChat Pay / Alipay CSV exports in the browser.
- Parse and categorize transactions locally.
- Show total income, total spend, savings, daily average, max spend day, category structure, top merchants, spending insights, and transaction details.
- Preserve the original analysis surfaces: spending heatmap, category breakdown, merchant ranking, monthly trend, daily spend line, and transaction table.
- Add a secondary Three.js cashflow field where time, category, and amount become an interactive visual surface.
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

This is not meant to compete with full accounting tools. The product point is a beautiful, private, shareable spending dashboard:

- more expressive than a spreadsheet;
- safer than uploading bills to a random SaaS;
- easier to use than a hand-built dashboard;
- visually strong enough to feel like a real personal finance object.
