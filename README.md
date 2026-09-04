# Mesonsoft — Next.js App

React + Next.js (App Router) build of the Mesonsoft website. Layout, design, colors,
fonts and content are unchanged — the original Elementor/Phlox markup and stylesheets
are reused verbatim. (The app was originally generated from three saved
WordPress/Elementor page captures; those captures and the extraction tooling have
been removed — `src/partials/` and `public/assets/` are now the canonical source.)

## Pages

| Route      | Title                                     |
| ---------- | ----------------------------------------- |
| `/`        | Mesonsoft – a passion for innovation      |
| `/about`   | About – Mesonsoft                         |
| `/contact` | Contact – Mesonsoft                       |

## How it works

- `src/partials/*.html` — shared header, footer, hidden blocks (offcanvas menu,
  search overlays, scroll-top) and the per-page `<main>` content, 1:1 from the
  original site. `src/partials/manifest.json` holds the ordered stylesheet links,
  ordered scripts, body classes and per-page titles/descriptions.
- `src/components/Partial.jsx` renders the extracted HTML with
  `html-react-parser`, preserving the exact DOM (classes, inline styles, SVGs,
  data-attributes) so the original CSS applies unchanged.
- `src/components/ScriptLoader.jsx` (client) loads the original jQuery / auxin /
  Elementor scripts sequentially in their original order after hydration.
- `src/app/layout.jsx` wraps every page with the original `<body>` classes, all 34
  stylesheets in original order, the shared header/footer and hidden blocks.
- `public/assets/` — the original site's CSS/JS/images, plus `public/assets/remote/`
  with fonts/favicons/images mirrored from mesonsoft.com.

## Commands

```bash
./start_local.sh              # clean, rebuild, and preview on port 3000
./start_local.sh -p 3100      # custom port
./start_local.sh --dev        # next dev (hot reload)
./start_local.sh --fresh      # reinstall node_modules and rebuild
```

Equivalent manual commands:

```bash
npm install
npm run dev       # develop at http://localhost:3000
npm run build     # static export into out/
npm start         # (static export: use ./start_local.sh or node scripts/preview.mjs)
node scripts/verify-assets.mjs   # check every referenced asset resolves (server must be running)
```

`start_local.sh` (modeled on `ourdreams/start_local.sh`) checks Node, installs
dependencies when needed, builds the static export to `out/`, and serves it with
`scripts/preview.mjs`. There is no local PHP proxy here — the contact form markup is
preserved but posts to the live site's WordPress endpoint.

## Fonts

Fonts are an exact byte-level match with the live site:

- **Quicksand, Roboto, Roboto Slab, Nunito** — the Elementor-hosted Google Font CSS
  files, mirrored with every `.woff2` under `public/assets/remote/`.
- **Spartan + Quicksand** — the site's Google Fonts stylesheet (saved as `css(2)`),
  with its `fonts.gstatic.com` woff2 files downloaded locally.
- **Icon fonts** — Font Awesome 5, Elementor eicons, and the Phlox auxin icon fonts
  (relative `../webfonts/`, `fonts/` refs resolved against the live site and mirrored).

The stylesheet cascade order also matches the live page (Google Fonts CSS before the
Elementor per-weight CSS), so the same font file wins for each family/weight.

Verify with `node scripts/verify-fonts.mjs` (server must be running): it compares
every `@font-face` rule reachable from the live vs. local home page and byte-hashes
each font file — current status: 273 files compared, 0 mismatches.



## Notes

- Nav links (`/`, `/about`, `/contact`) are rewritten to internal Next.js routes.
- Original `mesonsoft.com` fonts and icons are mirrored locally under
  `/assets/remote/wp-content/uploads/...`, so the site is fully self-contained.
- Hosting/tracking scripts (tccl) and the Google Maps loader from the saved pages are
  intentionally skipped; everything else is loaded.
