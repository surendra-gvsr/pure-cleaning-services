# Pure Cleaning Services — Chicago

Marketing site for Pure Cleaning Services (Chantelle & Robert). Carpet cleaning and
apartment move-out cleaning. The site's single job is to get a call or a text.

Static HTML/CSS. No build step, no dependencies, no JavaScript.

## Files

```
index.html                     the whole site
styles.css                     all styling, mobile-first
assets/chantelle-robert.jpg    owners photo (1200px, ~208 KB)
assets/chantelle-robert.webp   same photo, WebP (~126 KB, served first)
assets/favicon.svg             tab icon
```

## Responsive behaviour

| Width | Layout |
|---|---|
| < 620px | Single column. Sticky Call / Text bar pinned to the bottom. |
| 620–959px | Two-column service cards, four-across trust strip, three-across pricing tiers. |
| ≥ 960px | Sticky top header with phone CTA, two-column hero with photo, side-by-side price tables. Bottom bar hidden — the header carries the CTA. |

Tested at 390px, 768px, 1024px and 1440px.

## Editing the common things

- **Phone numbers** — search `7739566249` and `7734390922` in `index.html`. They appear in
  `tel:` links, `sms:` links, and as visible text. Change all of them.
- **Prices** — every price is plain text in `index.html`. Search for the dollar amount.
- **Service areas** — the `<ul class="chips">` list.
- **Colours** — the `:root` block at the top of `styles.css`.
- **The photo** — replace both files in `assets/` keeping the same filenames.

## Pre-launch checklist

- [ ] Confirm the neighbourhood list matches where you actually travel
- [ ] Replace `https://example.com/` in the `canonical` and `og:image` tags with the real URL
- [ ] Add before/after photos (biggest missing conversion asset)
- [ ] Set up a shared inbox for the texts so no lead gets missed
- [ ] Create a Google Business Profile and link it

## Push to GitHub

From this folder:

```bash
git init
git add .
git commit -m "Pure Cleaning Services site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/pure-cleaning-services.git
git push -u origin main
```

Create the empty repo first at https://github.com/new — name it
`pure-cleaning-services` and do **not** add a README, .gitignore, or licence
(this folder already has what it needs).

## Publish with GitHub Pages

1. In the repo, go to **Settings → Pages**
2. Under **Source**, pick **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)` → **Save**

Live in about a minute at:

```
https://YOUR-USERNAME.github.io/pure-cleaning-services/
```

### Custom domain

Buy the domain, then in **Settings → Pages → Custom domain** enter it and save.
At your registrar, add these DNS records:

```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
CNAME www  YOUR-USERNAME.github.io
```

Tick **Enforce HTTPS** once the certificate is issued (usually under an hour).

## Licence

Content, pricing, and photography © Pure Cleaning Services.
