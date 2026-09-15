# Quality Compass

React + TypeScript + Vite app for quality / ops workflows.

## Scripts

- `npm run dev` — local Vite dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — Oxlint
- `npm run deploy` — `wrangler pages deploy dist` to project `quality-compass`

## Cloudflare

This is a Vite SPA. Production files go in **`dist/`**. SPA routes use `public/_redirects`:

```
/*    /index.html   200
```

The last **successful** Git deploy was **Cloudflare Pages** on account `91b0009136c2aea55f4a0b8445cb0fc5` (check name `Cloudflare Pages`). A second Git integration, **Workers Builds** on account `15f8ea4f4a3632408a2edf8d64ebfa99`, posts the red `Workers Builds: quality-compass` check. `npx wrangler deploy` cannot update a Pages project, so that second integration fails after Vite even when the app compiles.

### Make deploys work

Pick **one**:

1. **GitHub Actions (this repo)**  
   Add repository secrets, then push to `main`:
   - `CLOUDFLARE_API_TOKEN` — token on the **Pages** account, with **Cloudflare Pages: Edit** (and Account: Read)
   - `CLOUDFLARE_ACCOUNT_ID` — `91b0009136c2aea55f4a0b8445cb0fc5`

2. **Pages Git integration**  
   In the Pages project `quality-compass` on that same account, reconnect Git. Dashboard:

   | Setting | Value |
   | --- | --- |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node.js version | **22** |

3. **Stop the red Workers check**  
   Disconnect Git under the Workers project on account `15f8ea4f…` (Worker → Settings → Builds → Disconnect). That integration cannot publish this Pages site.

`wrangler.json` uses `pages_build_output_dir: "dist"` and that Pages `account_id`. Do **not** point the output directory at `.vitepress/dist`.

If a `NODE_VERSION` env var is set in Pages, set it to `22` (or unset it so `.nvmrc` applies).

## Local deploy check

Requires **Node.js 22.13+** (see `.nvmrc` and `package.json` `engines`).

```bash
npm ci
npm run build
# confirm dist/index.html and dist/_redirects
npx wrangler pages deploy dist --project-name=quality-compass
```

## Oxlint

For type-aware lint rules, see the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules).
