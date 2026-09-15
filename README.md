# Quality Compass

React + TypeScript + Vite app for quality / ops workflows.

## Scripts

- `npm run dev` — local Vite dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — Oxlint
- `npm run deploy` — `wrangler deploy` (static assets + Worker)

## Cloudflare

Git deploys use **Workers Builds**: `npm run build`, then `npx wrangler deploy` on `main` and `npx wrangler versions upload` on pull requests.

Pull-request deploys cannot create a Worker that has never been published. `scripts/wrangler-ci.mjs` (installed via `postinstall`) maps `versions upload` to `deploy` so the first Git build can create `quality-compass`.

`wrangler.json` is a Worker named `quality-compass` (must match the dashboard Worker). Vite output is `dist/`. Client routes use `assets.not_found_handling: "single-page-application"` and `public/_redirects`.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy | `npx wrangler versions upload` |
| Node.js version | **22** |

If deploy fails with a **workers.dev subdomain** error, open Workers & Pages in that Cloudflare account and register a `*.workers.dev` subdomain once.

## Local deploy check

Requires **Node.js 22.13+**.

```bash
npm ci
npm run build
npx wrangler deploy --dry-run
```

## Oxlint

For type-aware lint rules, see the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules).
