# The Contributor — Reskin Punch List

_Status as of this session. Files: `index.html`, `article.html`, `page.html`, `team.html`._

## ✅ Done

### Homepage cards
- Section label: charcoal-600 default → blue + underline on hover; click filters by section
- Byline/author: blue default → lighter blue (650) + underline on hover; click filters by author
- Inline links: blue → lighter blue on hover
- Image ratio locked to 3:2 (4×6); card padding uniform 30px; card heights consistent (stretch + line clamps)
- Image captions on feature cards
- Filter row: more space + equidistant between dark bar and first card
- Bigger vertical gap between 3-up rows; "Looking for a Paper" padding trimmed
- "See More" bigger + bold

### Nav (all pages)
- Bigger logo, wider item spacing, Donate/Buy bumped to 18px
- Dropdown links: charcoal default → blue + underline on hover (not underlined by default)
- Fixed the "funky" hover dead-zone that closed the menu mid-move

### Article page
- Wider reading column + larger body type (desktop sizing, not mobile)
- Yellow print button; "Next Article" blue + underline
- Related articles: left thumbnail, drop shadow, hover-move, light-gray divider, consistent heights

### Footer (all pages)
- Restructured to match design: logo | mission/vision | stacked contact; copyright aligned to mission column

### Meet Our Team
- Built `team.html` to the design, branded (charcoal band + sunflower accents)
- **Pulls live from the site**: real photos (face-centered) + bios for all team & board, plus Values cards
- No-photo / logo-placeholder entries fall back to the brand **C**

### WP content pages (Volunteer, Intern, etc.)
- Floated images now become clean **two-column media modules** — square image one side, text the other, **alternating**, no wrap-under

### Search / Find a Paper
- Modal works (replaced the old prompt); brand Figtree font; returns results (e.g. "Judy")
- Result cards show the **banner photo**, with the on-brand **C scene** when no photo

### Programs / Donate / Get-Involved pages (`page.html`)
- Body type bumped to match articles; **subheadings enlarged**
- Floated images → alternating two-column **media modules** (square image, no wrap-under); closing **"Where to Turn"** module forced image-left
- **Divider** inserted between a leading video and the first heading
- **Donate**: brand-styled Donate button; photo block rendered as a **3-up gallery** (square crops, CDN-resized so they load)

### Pagination
- "See More" now renders **complete rows of 3**, buffering the remainder for the next click

### Faces
- Auto-crop/face-centering runs on every card, article, related thumbnail, and team photo (app-side)

---

## 🔧 Remaining — no design needed (I can do these now)

- **Article body**: vary image widths for visual rhythm (less uniform inline)
- **Print stylesheet**: optional dedicated print layout

## 🎨 Remaining — needs a design export or a decision from you

- **Programs page**: the generic two-column/divider treatment is in; pixel-matching the Figma (image beside each subheading, exact module order) needs the design export
- **Join Our Board**: needs a **hero image** (and confirm layout)
- **Sponsors / Latest Events**: convert sponsors to a **logo carousel** _(OK?)_; propose a better Latest Events module
- **Donate**: confirm 3-up gallery (done) vs. a slideshow preference

## 🔌 Remaining — backend / your side (live URLs)

- **Buy a Paper** → route straight to checkout (currently stops at old site)
- **Nav links** → direct routing where any intermediate stop page exists
