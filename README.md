# The Contributor — Reskin

Static frontend that pulls live content from `thecontributor.org/wp-json/`
and renders it through a Figma-based design.

## Files

| File | Purpose |
|---|---|
| `index.html` | Homepage — hero feature, yellow CTA, story grid, drawer nav |
| `article.html` | Article detail — accepts `?slug=…` or `?id=…`, falls back to most recent post |
| `page.html` | Static-page template — accepts `?slug=programs`, `?slug=how-it-works`, etc. Pulls from `/wp-json/wp/v2/pages` |
| `404.html` | Legacy-URL router. Catches old WP URLs (`/some-post/`, `/our-story/programs/`, `/tag/news/`) and rewrites them to the new `?slug=…` form |

## Deploying

Drop all four files at the root of any static host:

- **GitHub Pages** — works out of the box; serves `404.html` automatically
- **Netlify / Cloudflare Pages / Vercel** — same; `404.html` fallback fires for unknown paths
- **S3 + CloudFront** — set the error document to `404.html` and error response to 200

Once the new domain is live (DNS pointed at the static host), all old WP URLs
will keep working through the 404.html router.

## Test modes

- `index.html?drawer=top|about|involved` — preview the mobile drawer panes on desktop
- `index.html?tag=<tag-slug>` / `?category=<cat-slug>` — filter the homepage feed
- `article.html?slug=<post-slug>` — load any specific article
- `page.html?slug=<page-slug>` — load any specific WP page

## CORS

The browser fetches directly from `thecontributor.org/wp-json/wp/v2/`. WordPress
core sends CORS headers, so this should work from any origin. If a request is
ever blocked (Cloudflare strict mode, custom WAF rule), each page has a
"Retry via CORS Proxy" button that falls through to `corsproxy.io`.

## Link routing

All on-page links stay inside this app. A `localize()` helper in each page
rewrites any `thecontributor.org/...` URL surfaced by the WP API (author links,
category links, in-body links) to a local route:

| WP URL                              | Local route                       |
|---|---|
| `/<post-slug>/`                     | `article.html?slug=<post-slug>`   |
| `/our-story/<slug>/`, `/get-involved/<slug>/`, `/meet-us/`, etc. | `page.html?slug=<slug>` |
| `/donate/`, `/pay/`                 | `page.html?slug=donate` / `?slug=pay` |
| `/our-vendors/find-a-vendor/`       | `page.html?slug=find-a-vendor`    |
| `/tag/<x>/`, `/category/<x>/`       | `index.html?tag=<x>` / `?category=<x>` |
| `/author/<x>/`                      | `index.html?author=<x>`           |
| `/our-paper/`                       | `index.html`                      |

`404.html` applies the same mapping for legacy inbound URLs.

The only remaining outbound calls to `thecontributor.org` are:

- `wp-json/wp/v2/posts|pages|tags|categories` — the data feed
- `mailto:info@thecontributor.org`
- `wp-admin` / `wp-login` / `wp-content` / `feed` paths handled by 404.html (real WP system endpoints)

## Figma source

The design lives at
<https://www.figma.com/design/Yq7atHBD0iFTirxbEQDW61/The-Contributor---Website>.
Layout values (container width, gutter, card sizes, palette) are hard-coded
from the Figma frame. Verifying pixel parity requires a Figma access token —
not connected in this repo's CI.
