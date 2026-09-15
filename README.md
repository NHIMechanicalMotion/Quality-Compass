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
| Node.js version | **22** (must match `.nvmrc`; `pdfjs-dist` and `@supabase/supabase-js` require Node 22+) |

If a `NODE_VERSION` environment variable is set in the Pages project, it **overrides** `.nvmrc`. Set it to `22` (or unset it so `.nvmrc` / `.node-version` take effect). Node 20 will emit `EBADENGINE` warnings and can fail the Vite production build.

Do **not** point the output directory at `.vitepress/dist` — that path was a temporary workaround and is no longer used.

SPA client-side routes are handled by `public/_redirects`:

```
/*    /index.html   200
```

## Local deploy check

Requires **Node.js 22.13+** (see `.nvmrc` and `package.json` `engines`).

```bash
npm ci
npm run build
# confirm assets under dist/
```

## Oxlint

For type-aware lint rules, see the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules).
