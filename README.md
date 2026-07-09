# Spendarium

**Local-first Spending Atlas for WeChat Pay, Alipay, and CSV bills**

[Live Demo](https://chang-xinhai.github.io/Spendarium/) · [GitHub](https://github.com/chang-xinhai/Spendarium)

Spendarium turns everyday payment records into a private, visual finance report. Upload exported bills from WeChat Pay, Alipay, or compatible CSV files, then inspect your spending as heatmaps, category structures, merchant rankings, monthly trends, transaction tags, and a Three.js terrain map.

> Privacy first: all parsing and analysis run inside your browser. Your bills do not leave your computer.

---

## Features

| Feature | Description |
| --- | --- |
| **WeChat Pay / Alipay Import** | Parse exported payment bills from WeChat Pay and Alipay, with fallback support for generic CSV files. |
| **Local Browser Parsing** | Read files through the browser File API; no backend, account, or remote upload required. |
| **Spending Terrain** | Render a Three.js financial landscape where time, category, and spending amount become a readable terrain. |
| **GitHub-style Heatmap** | Show the latest 365 days by default, with year-level views for cross-year bills. |
| **Topic Tags** | Create, delete, and assign multiple tags to transactions for hobbies, trips, projects, or life events. |
| **Detailed Report Workspace** | Review summary cards, category breakdowns, top merchants, monthly cashflow, daily spending, and transaction details. |
| **Privacy Mask** | Hide merchant names when exporting or sharing a report. |
| **PNG / HTML Export** | Export the current report as an image or a standalone HTML file, including tag context. |

---

## Quick Start

### Online

Open the hosted site:

```txt
https://chang-xinhai.github.io/Spendarium/
```

Then upload exported bills from WeChat Pay, Alipay, or a compatible CSV file. You can also click **试用示例** to explore with demo data.

### Local Development

```bash
git clone https://github.com/chang-xinhai/Spendarium.git
cd Spendarium
npm install
npm run dev
```

Build the static site:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## Supported Bills

| Source | Status | Notes |
| --- | --- | --- |
| **WeChat Pay** | Supported | Detects `微信支付账单` exports or files with `微信` in the filename. |
| **Alipay** | Supported | Detects `支付宝` / `交易分类` exports or files with `支付宝` in the filename. |
| **Generic CSV** | Supported | Requires columns such as date/time and amount; optional merchant/category/direction fields improve the report. |

Spendarium can import multiple files at once. Transactions are merged and sorted locally before analysis.

---

## How It Works

```txt
Payment CSV files
      │
      ▼
Browser File API
      │
      ▼
Local parser and category rules
      │
      ▼
Finance model
      │
      ├── Spending terrain
      ├── Heatmap
      ├── Category and merchant analysis
      ├── Monthly / daily trends
      ├── Topic tag views
      └── PNG / HTML export
```

The app is designed as a static website. It can run on GitHub Pages because all meaningful work happens in the browser.

---

## Privacy Model

- Files are parsed locally in the browser.
- No bill data is sent to a server.
- No login, account system, or hosted database is required.
- Topic tags are stored in browser `localStorage`.
- Exports are generated locally from the current report view.
- Do not commit real payment CSV files or screenshots containing private transactions.

---

## Tech Stack

| Layer | Tooling |
| --- | --- |
| Framework | Astro |
| UI | React |
| 3D | Three.js, `@react-three/fiber`, `@react-three/drei` |
| Export | `html-to-image`, standalone HTML generation |
| Deployment | GitHub Pages + GitHub Actions |

---

## Project Structure

```txt
src/
├── components/
│   ├── SpendariumApp.tsx    # Main app composition
│   └── TerrainMap.tsx       # Three.js spending terrain
├── lib/
│   ├── parser.ts            # WeChat Pay / Alipay / CSV parsing
│   ├── finance.ts           # Finance model and summaries
│   ├── categories.ts        # Category rules
│   ├── exportReport.ts      # Standalone HTML export
│   └── sampleData.ts        # Deterministic demo data
├── pages/
│   └── index.astro
└── styles/
    └── global.css
```

---

## FAQ

**Q: Does Spendarium upload my bill data?**

A: No. The current version parses files locally in the browser and does not use a backend.

**Q: Can I use bills across multiple years?**

A: Yes. The heatmap shows the latest 365 days by default and lets you switch to individual years.

**Q: Can one transaction have multiple tags?**

A: Yes. A transaction can belong to multiple topic tags, such as `旅行`, `学习`, or a custom hobby/project tag.

**Q: Can I share a report without exposing merchant names?**

A: Yes. Enable the merchant privacy mask before exporting PNG or HTML.

**Q: Is this a full accounting app?**

A: No. Spendarium is closer to a private spending atlas: visual, inspectable, and lightweight, not a full bookkeeping system.

---

## Deployment

This repository is configured for GitHub Pages:

```txt
site: https://chang-xinhai.github.io
base: /Spendarium
```

The GitHub Actions workflow builds Astro and publishes `dist/` to Pages.

---

Made by [chang-xinhai](https://github.com/chang-xinhai).
