# The Contributor — Site Package

A static front-end for **thecontributor.org**. It pulls all articles, pages, and
team data **live from the existing WordPress site** (`/wp-json/`), so most
content updates require **no code changes at all**.

## What's in this package

| File | Purpose |
|---|---|
| `index.html` | Homepage — hero + feature cards, "Looking for a Paper" CTA, 3-up story grid, filters, See-More pagination |
| `article.html` | Article detail — `?slug=…`; share row, yellow print button, related articles with thumbnails |
| `page.html` | Static-page template — `?slug=programs`, `?slug=donate`, etc. Renders WP pages with two-column media modules, 3-up galleries, brand buttons |
| `team.html` | Our Team & Values — pulls the live "Meet Our Team" WP page (photos, bios, board, values) |
| `404.html` | Legacy-URL router: rewrites old WP URLs (`/some-post/`, `/tag/x/`) to the new `?slug=` routes |
| `search.js` | Site-wide search modal (articles, pages, authors) — bound to the magnifier icon on every page |
| `smart-crop.js` + `assets/pico.js` + `assets/facefinder` | **Face detection**: auto-centers faces in every card, article, related-article and team photo, in the browser |
| `assets/` | Brand placeholder art (blackletter C, chat bubble, pencil) and the CTA decoration |
| `PUNCHLIST.md` | Running design punch list with done/remaining status |

## Deploying

Drop everything at the root of any static host:

- **GitHub Pages** — push to `clovenbradshaw-ctrl/contributor`, works out of the box (`404.html` served automatically)
- **Netlify / Cloudflare Pages / Vercel** — same
- **S3 + CloudFront** — set the error document to `404.html` with a 200 response

Once DNS points at the static host, all old WordPress URLs keep working through the 404 router.

---

# How to update things

## Content that updates AUTOMATICALLY (edit in WordPress, nothing else)

- **Articles** — publish/edit posts in WP; homepage, article pages, related articles, and search reflect them immediately. Categories/tags drive the card labels and filters.
- **Static pages** (Programs, Volunteer, Intern, Donate, How It Works, Where to Turn…) — edit the WP page. The template automatically:
  - pairs each image with its neighboring text into alternating two-column modules (square crop, no text wrap-under) — the "Where to Turn" module always puts the image on the left
  - renders WP galleries as a 3-up grid of square crops
  - styles any FrontStream/WP button as the brand yellow button
  - adds a divider after a leading video
- **Team page** — edit the WP "Meet Our Team" page (id 551). Each person is a *media-and-text* block: photo on one side, a quote block starting with **Name in bold** on the other. The page picks up new people, photos, and bios automatically.
  - **Photos**: square-ish headshots work best; faces are auto-centered in the circle.
  - **No headshot?** Leave the image out (or use the logo) — the site shows the brand "C" instead.
- **Image captions** — set the caption on the WP featured image; it renders under the card/article image.

## Content that is HARD-CODED (edit the HTML files)

These appear in **all four HTML files** (`index`, `article`, `page`, `team`) — update each:

- **Nav menus** — search for `nav-dropdown` (desktop) and `drawer-item` (mobile drawer). Links use `page.html?slug=…` routes.
- **Footer** — mission/vision text, mailing address, vendor sales office, social links: search for `<footer class="site">`.
- **Donate / Buy a Paper URLs** — in the header (`class="btn"`); Buy a Paper currently points at `thecontributor.org/pay/`. When the new checkout URL exists, replace it here (4 files).
- **Homepage only**: the filter list (`filters-popover`) and the "Looking for a Paper?" CTA copy.
- **Team page fallback** — the static content inside `#team-people` / `#board-people` / `#values-grid` shows only if the live fetch fails; refresh it occasionally to stay roughly current.

## Brand tokens

Colors and type live in the `:root` block at the top of each HTML file
(`--charcoal-700`, `--sunflower-700`, `--blue-700/650`, `--font-sans: Figtree`,
`--font-serif: Libre Baskerville`). Change once per file.

Hover rules (site-wide convention):
- Section labels & nav dropdown links: **charcoal → blue + underline** on hover
- Author names & inline links: **blue → lighter blue (650) + underline** on hover

## Re-exporting the standalone Team page

`The Contributor - Our Team.html` is a frozen, fully-offline snapshot (photos
inlined). It does **not** auto-update — re-export after staff changes.

## Still open (see PUNCHLIST.md)

- Sponsors → logo carousel + improved Latest Events module (awaiting go-ahead/designs)
- Buy a Paper → direct checkout URL (backend)
- Optional: print stylesheet, varied article image widths
