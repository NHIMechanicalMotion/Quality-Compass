# Build Pipeline & Cloudflare Pages Deployment

This document details the build scripts, compiler configurations, Cloudflare Pages hosting integration, and pre-commit verification steps for **Quality Compass**.

---

## 1. Toolchain & Dependencies

Quality Compass is built using modern front-end tooling:
- **Build Engine:** Vite 8 (`vite.config.ts`)
- **Language & Type Checking:** TypeScript 5.8+ (`tsc -b`, configurations in `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)
- **Styling Compiler:** Tailwind CSS v4 via `@tailwindcss/vite`
- **Linter:** Oxlint (`.oxlintrc.json`)
- **Platform Engine:** React 19 (`react`, `react-dom`)

---

## 2. Build Scripts & Deployment Pipeline

Defined in `package.json`:

```json
{
  "engines": {
    "node": ">=22.13.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build && node -e \"console.log('Vite build succeeded.')\"",
    "lint": "oxlint",
    "preview": "vite preview",
    "deploy": "npm run build && wrangler deploy",
    "postinstall": "node scripts/install-wrangler-shim.mjs"
  }
}
```

### The `build` Command:
1. `tsc -b`: Executes TypeScript project reference build, verifying 100% strict type safety across all components, utilities, and services. If any type mismatch or invalid prop occurs, compilation halts immediately.
2. `vite build`: Bundles the application into the `dist/` directory, tree-shaking dead code, optimizing CSS via Tailwind v4, and chunking dynamic libraries (e.g., `pdfjs-dist`, `tesseract.js`, `exceljs`).

---

## 3. Cloudflare Deployment Architecture

Quality Compass is deployed to **Cloudflare** via **Workers Builds** serving static assets with Single Page Application routing:

### A. Wrangler Configuration (`wrangler.json`)
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "quality-compass",
  "main": "worker/index.js",
  "compatibility_date": "2026-09-01",
  "assets": {
    "directory": "dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  }
}
```

### B. Client-Side SPA Routing
- Client-side routing is handled through Cloudflare's built-in `assets.not_found_handling: "single-page-application"` in `wrangler.json`.
- **Inviolable Rule:** Do **not** add a Pages-style `/* /index.html 200` rewrite to `_redirects` — Cloudflare Workers treats that rewrite as an infinite redirect loop (error 100324).

### C. Automated PR Builds Shim
`scripts/install-wrangler-shim.mjs` (executed during `postinstall`) intercepts pull-request deployments where `wrangler versions upload` is invoked, ensuring non-production builds succeed seamlessly even before the initial production worker has been provisioned.

---

## 4. Environment Variables

Quality Compass uses Vite's `import.meta.env` system for cloud service credentials. Fallback defaults are configured in source files for seamless local development:

| Variable Name | Required | Default / Description |
| :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | Optional | `https://jggdqmygudsiueaiqzcn.supabase.co` (QMS Database) |
| `VITE_SUPABASE_ANON_KEY` | Optional | Anon public API key for QMS Supabase |
| `VITE_ODOO_SUPABASE_URL` | Optional | `https://vrsbfjiafjrbwbyullkh.supabase.co` (NHIMM Pulse ERP) |
| `VITE_ODOO_SUPABASE_ANON_KEY`| Optional | Anon public API key for NHIMM Pulse ERP |

> [!CAUTION]
> Never hardcode or commit service role keys, database postgres passwords, or private API keys to any git-tracked file.

---

## 5. Pre-Commit & AI Verification Checklist

Before opening a pull request or completing an AI agent prompt, always execute:

```bash
# 1. Verify strict TypeScript compilation and production bundling
npm run build

# 2. Check for linting violations
npm run lint

# 3. Test local production bundle execution
npm run preview
```

Ensure:
- [x] Zero TypeScript compilation errors (`tsc -b` exits with code 0).
- [x] `dist/` contains `index.html`, assets, and `_redirects`.
- [x] `.vitepress/dist/` is successfully updated by the `postbuild` script.
- [x] No live Supabase database tables or records are overwritten or dropped.
- [x] Document control operations strictly enforce PDF-only controlled documents.
