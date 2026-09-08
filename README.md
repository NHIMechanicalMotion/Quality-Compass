# Quality Compass

React + TypeScript + Vite app for quality / ops workflows.

## Scripts

- `npm run dev` — local Vite dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — Oxlint

## Cloudflare Pages

This app is a standard Vite SPA. Build output is **`dist`** (also set in `wrangler.json` as `pages_build_output_dir`).

In the Cloudflare Pages project settings, use:

| Setting | Value |
| --- | --- |
| Framework preset | Vite (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | 20 (or matching `.nvmrc`) |

Do **not** point the output directory at `.vitepress/dist` — that path was a temporary workaround and is no longer used.

SPA client-side routes are handled by `public/_redirects`:

```
/*    /index.html   200
```

## Local deploy check

```bash
npm ci
npm run build
# confirm assets under dist/
```

## Oxlint

For type-aware lint rules, see the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules).
