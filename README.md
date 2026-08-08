# Pure Cleaning Services — Chicago

Marketing site for Pure Cleaning Services (Chantelle & Robert). Carpet cleaning and
apartment move-out cleaning. The site's single job is to get a call or a text.

Static HTML/CSS plus one small vanilla-JS file for the booking calendar.
No build step, no dependencies, no framework.

## Files

```
index.html                     the whole site
styles.css                     all styling, mobile-first
booking.js                     booking request builder (vanilla, no deps)
tests/booking.test.mjs         unit tests for the booking logic
assets/chantelle-robert.jpg    owners photo (1200px, ~208 KB)
assets/chantelle-robert.webp   same photo, WebP (~126 KB, served first)
assets/favicon.svg             tab icon
```

## Responsive behaviour

| Width | Layout |
|---|---|
| < 620px | Single column. Sticky Call / Book / Text bar pinned to the bottom. Booking estimate card sits below the form. |
| 620–959px | Two-column service cards, four-across trust strip, three-across pricing tiers, four-across booking options. |
| ≥ 960px | Sticky top header with phone CTA, two-column hero with photo, side-by-side price tables. Booking estimate card becomes a sticky sidebar. Bottom bar hidden — the header carries the CTA. |

Tested at 320px, 390px, 768px and 1440px.

## The booking calendar

**Read this before promising customers anything.** GitHub Pages serves static
files only — there is no server and no database behind this site. So the
calendar **cannot** check the real schedule, hold a slot, or stop two people
picking the same morning. It is a *request builder*, not a reservation system.

What it actually does:

1. Customer picks service → size → date → time window → contact details
2. It prices the job live from the printed price list in `index.html`
3. **Send by text** / **Send by email** opens their own messaging app with the
   whole request already written out
4. Chantelle or Robert reply to confirm — same as today, minus the back-and-forth

The card says *"nothing is booked until we reply to confirm"* so nobody turns up
expecting a slot that was never agreed. Leave that line in.

Carpet requests text `773-956-6249`; move-outs text `773-439-0922`.

### Rules you can change

All at the top of `booking.js`:

| What | Constant | Now |
|---|---|---|
| How far ahead people can book | `BOOKING_HORIZON_DAYS` | 90 days |
| Closed days | `CLOSED_WEEKDAYS` | `[0]` — Sunday |
| Time windows | `TIME_WINDOWS` | 8–11, 11–2, 2–5, 5–7 |
| Every price | `PRICES` | mirrors the printed list |

Earliest bookable day is always **tomorrow** (`firstBookableDate`) — a request
sent at 9pm for "today" is meaningless. Same-day work stays a phone call.

**If you change a price in `index.html`, change it in `PRICES` too.** They are
two separate copies and nothing enforces that they agree.

### Tests

```bash
node --test tests/booking.test.mjs
```

26 tests, no dependencies, Node 18+. They cover the date maths (timezone and
DST safety, the 90-day horizon, closed Sundays), the price calculations, and
the encoding of the text/email handoff links.

### If you outgrow it

For real availability — a calendar that knows when you are already booked — you
need a service. Drop a [Cal.com](https://cal.com) or Calendly embed into the
`#book` section and delete `booking.js`. Both have free tiers and both handle
double-booking, reminders, and confirmations properly.

## Editing the common things

- **Phone numbers** — search `7739566249` and `7734390922` in `index.html` **and
  in `booking.js`** (the `CONTACT` block). They appear in `tel:` links, `sms:`
  links, and as visible text. Change all of them.
- **Prices** — every price is plain text in `index.html`. Search for the dollar
  amount. Then mirror the change in `PRICES` in `booking.js`.
- **Service areas** — the `<ul class="chips">` list.
- **Colours** — the `:root` block at the top of `styles.css`.
- **The photo** — replace both files in `assets/` keeping the same filenames.

## Pre-launch checklist

- [ ] Confirm the neighbourhood list matches where you actually travel
- [x] ~~Replace `https://example.com/` in the `canonical` and `og:image` tags~~ — done
- [ ] Confirm the booking rules are right: closed Sundays, 8am–7pm windows, 90 days ahead
- [ ] Add before/after photos (biggest missing conversion asset)
- [ ] Set up a shared inbox for the texts so no lead gets missed
- [ ] Create a Google Business Profile and link it

## Where it lives

- **Live:** https://surendra-gvsr.github.io/pure-cleaning-services/
- **Repo:** https://github.com/surendra-gvsr/pure-cleaning-services

GitHub Pages serves `main` from `/ (root)`. Pushing to `main` redeploys in about
a minute — there is nothing to build.

```bash
git add .
git commit -m "what changed"
git push
```

### Working on it locally

`booking.js` is a plain script, so opening `index.html` straight from the file
manager works. To match the live setup exactly:

```bash
python -m http.server 8000
# then open http://127.0.0.1:8000
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
