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
- `article.html?slug=<post-slug>` — load any specific article
- `page.html?slug=<page-slug>` — load any specific WP page

## CORS

The browser fetches directly from `thecontributor.org/wp-json/wp/v2/`. WordPress
core sends CORS headers, so this should work from any origin. If a request is
ever blocked (Cloudflare strict mode, custom WAF rule), each page has a
"Retry via CORS Proxy" button that falls through to `corsproxy.io`.

## Known external links (not rewritten to local)

These deliberately still go back to `thecontributor.org`:

- `/donate/` and `/pay/` — real donation and payment flows
- `/our-vendors/find-a-vendor/` — interactive vendor locator (not a content page)
- `/tag/<tag>/` and `/category/<cat>/` — no local archive template built yet

If you want a local archive template, ask and we'll build a fifth file.
