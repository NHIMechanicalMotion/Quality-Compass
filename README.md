# Quality Compass

React + TypeScript + Vite app for quality / ops workflows.

## Scripts

- `npm run dev` — local Vite dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — Oxlint
- `npm run deploy` — upload `dist/` with Wrangler (`wrangler deploy`)

## Cloudflare

This app is a Vite SPA. Production assets go in **`dist/`**.

Git integration on this repo uses **Workers Builds**: `npm run build`, then `npx wrangler deploy`. `wrangler.json` must be a Workers config (`assets.directory`), not a Pages config (`pages_build_output_dir`). Using the Pages field makes `wrangler deploy` fail after Vite finishes.

The Worker name in the Cloudflare dashboard **must** be `quality-compass` (same as `wrangler.json`).

Pull-request checks from Cloudflare stay red unless **non-production branch builds** are enabled. A red "Workers Builds" check that completes in under a second is that skip, not a Vite failure. Enable it under **Worker → Settings → Builds**, or merge to `main` for a production deploy.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` (or `npm run deploy`, which builds first) |
| Non-production deploy command | `npx wrangler versions upload` |
| Non-production branch builds | **On** (required for PR preview checks) |
| Node.js version | **22** (must match `.nvmrc`; `pdfjs-dist` and `@supabase/supabase-js` require Node 22+) |

If a `NODE_VERSION` environment variable is set on the Worker, it **overrides** `.nvmrc`. Set it to `22` (or unset it).

SPA client-side routes are handled by `assets.not_found_handling: "single-page-application"` in `wrangler.json`. `public/_redirects` is still copied into `dist/` for Pages-style fallbacks:

```
/*    /index.html   200
```

If a Pages project is still connected, keep its **Build output directory** set to `dist` in the dashboard. Do **not** point it at `.vitepress/dist`.

## Local deploy check

Requires **Node.js 22.13+** (see `.nvmrc` and `package.json` `engines`).

```bash
npm ci
npm run build
npx wrangler deploy --dry-run
# confirm assets under dist/ and that Wrangler accepts the Workers assets config
```

## Oxlint

For type-aware lint rules, see the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules).
