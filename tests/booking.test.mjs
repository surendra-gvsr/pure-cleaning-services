/* Tests for the booking request builder.
   Run: node --test tests/
   No dependencies — booking.js is a classic script that also
   speaks CommonJS, so createRequire loads it directly. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const B = require("../booking.js");

/* ---------- helpers ---------- */
const d = (y, m, day) => new Date(y, m - 1, day);
const pick = (e) => [e.min, e.max];
function nextWeekday(from, wanted) {
  let x = B.addDays(from, 1);
  while (x.getDay() !== wanted) x = B.addDays(x, 1);
  return x;
}

/* =========================================================
   Date logic
   ========================================================= */
test("startOfDay strips the time without shifting the calendar day", () => {
  const late = new Date(2026, 7, 7, 23, 45, 30);
  const s = B.startOfDay(late);
  assert.equal(s.getFullYear(), 2026);
  assert.equal(s.getMonth(), 7);
  assert.equal(s.getDate(), 7, "23:45 local must stay on the 7th");
  assert.equal(s.getHours(), 0);
});

test("early-morning local time does not roll back a day", () => {
  // The UTC-conversion bug shows up here: 00:30 local in Chicago
  // is 05:30/06:30 UTC — same day. But 00:30 local formatted via
  // toISOString() in a UTC+X zone would report the previous day.
  const early = new Date(2026, 0, 1, 0, 30);
  assert.equal(B.formatDateLong(B.startOfDay(early)),
    B.formatDateLong(d(2026, 1, 1)));
});

test("today and the past are not bookable; tomorrow is the floor", () => {
  const today = d(2026, 8, 7);
  assert.equal(B.isDateAvailable(today, today), false);
  assert.equal(B.isDateAvailable(B.addDays(today, -1), today), false);
  assert.equal(B.isDateAvailable(d(2020, 1, 1), today), false);

  const tomorrow = B.addDays(today, 1);
  assert.equal(B.isDateAvailable(tomorrow, today), tomorrow.getDay() !== 0,
    "tomorrow is bookable unless it lands on a closed Sunday");
});

test("Sundays are closed", () => {
  const today = d(2026, 8, 7);
  const sunday = nextWeekday(today, 0);
  assert.equal(sunday.getDay(), 0);
  assert.equal(B.isDateAvailable(sunday, today), false);

  const monday = B.addDays(sunday, 1);
  assert.equal(B.isDateAvailable(monday, today), true);
});

test("booking horizon stops at 90 days", () => {
  const today = d(2026, 8, 7);
  const last = B.addDays(today, B.BOOKING_HORIZON_DAYS);
  const past = B.addDays(today, B.BOOKING_HORIZON_DAYS + 1);
  assert.equal(B.isDateAvailable(past, today), false);
  // the boundary itself is valid unless it is a Sunday
  assert.equal(B.isDateAvailable(last, today), last.getDay() !== 0);
});

test("date arithmetic crosses month and year boundaries", () => {
  assert.equal(B.formatDateLong(B.addDays(d(2026, 12, 31), 1)),
    B.formatDateLong(d(2027, 1, 1)));
  assert.equal(B.formatDateLong(B.addDays(d(2026, 3, 1), -1)),
    B.formatDateLong(d(2026, 2, 28)));
  // 2028 is a leap year
  assert.equal(B.formatDateLong(B.addDays(d(2028, 3, 1), -1)),
    B.formatDateLong(d(2028, 2, 29)));
});

test("DST spring-forward day still advances exactly one calendar day", () => {
  // US DST 2026 begins Sun Mar 8. Naive "+86400000ms" arithmetic
  // lands on the wrong day here; the (y,m,d) constructor does not.
  const before = d(2026, 3, 7);
  const after = B.addDays(before, 1);
  assert.equal(after.getDate(), 8);
  assert.equal(after.getMonth(), 2);
});

/* =========================================================
   Calendar grid
   ========================================================= */
test("monthMatrix returns whole weeks and every day of the month", () => {
  const weeks = B.monthMatrix(2026, 7); // August 2026
  const flat = weeks.flat();
  assert.equal(flat.length % 7, 0, "grid must be whole weeks");

  const real = flat.filter(Boolean);
  assert.equal(real.length, 31, "August has 31 days");
  assert.equal(real[0].getDate(), 1);
  assert.equal(real[real.length - 1].getDate(), 31);
});

test("monthMatrix aligns the first day under the right weekday column", () => {
  const weeks = B.monthMatrix(2026, 7);
  const first = new Date(2026, 7, 1);
  const col = weeks[0].findIndex((c) => c && c.getDate() === 1);
  assert.equal(col, first.getDay(), "column index must equal the weekday");
});

test("monthMatrix handles a leap February", () => {
  const real = B.monthMatrix(2024, 1).flat().filter(Boolean);
  assert.equal(real.length, 29);
});

/* =========================================================
   Estimates
   ========================================================= */
test("carpet packages price straight off the printed list", () => {
  assert.deepEqual(pick(B.estimate({ service: "carpet", pkg: "1br" })), [80, 150]);
  assert.deepEqual(pick(B.estimate({ service: "carpet", pkg: "2br" })), [120, 200]);
  assert.deepEqual(pick(B.estimate({ service: "carpet", pkg: "3br" })), [180, 300]);
});

test("carpet add-ons stack onto the package", () => {
  const e = B.estimate({
    service: "carpet", pkg: "2br", addons: ["petOdor", "deodorizer"]
  });
  // 120-200 + 30-50 + 20-40
  assert.deepEqual(pick(e), [170, 290]);
});

test("room-by-room multiplies each room type by its count", () => {
  const e = B.estimate({
    service: "carpet",
    pkg: "rooms",
    rooms: { bedroom: 2, hallway: 1, stairs: 1 }
  });
  // bedroom 40-60 x2 = 80-120, hallway 15-30, stairs 40-75
  assert.deepEqual(pick(e), [135, 225]);
});

test("furniture moving is flagged open-ended because the list says $20+", () => {
  const e = B.estimate({ service: "carpet", pkg: "1br", addons: ["furniture"] });
  assert.equal(e.openEnded, true);
  assert.match(B.formatEstimate(e), /\+$/);
});

test("move-out flat rates match the tier table", () => {
  assert.deepEqual(pick(B.estimate({ service: "moveout", units: 1 })), [200, 200]);
  assert.deepEqual(pick(B.estimate({ service: "moveout", units: 2 })), [400, 400]);
});

test("three or more units defers to a phone quote", () => {
  const e = B.estimate({ service: "moveout", units: 3 });
  assert.equal(e.callForRate, true);
  assert.equal(B.formatEstimate(e), "Call for rate");
});

test("interior windows multiply by quantity", () => {
  const e = B.estimate({
    service: "moveout", units: 1, addons: ["windows"], windows: 4
  });
  // 200 flat + (5-10 x4)
  assert.deepEqual(pick(e), [220, 240]);
});

test("add-ons from the other service are ignored", () => {
  // petOdor is a carpet add-on; it must not price into a move-out.
  const e = B.estimate({ service: "moveout", units: 1, addons: ["petOdor"] });
  assert.deepEqual(pick(e), [200, 200]);
});

test("empty carpet selection reads as a dash, not $0", () => {
  const e = B.estimate({ service: "carpet", pkg: "nonsense" });
  assert.equal(B.formatEstimate(e), "—");
});

/* =========================================================
   Message + handoff links
   ========================================================= */
const baseSel = {
  service: "carpet",
  pkg: "2br",
  addons: ["petOdor"],
  date: d(2026, 9, 15),
  timeWindow: "morning",
  name: "Dana Reyes",
  phone: "773-555-0134",
  address: "Hyde Park"
};

test("message carries every field the crew needs", () => {
  const msg = B.buildMessage(baseSel);
  assert.match(msg, /Carpet cleaning/);
  assert.match(msg, /2 bedroom/);
  assert.match(msg, /Pet odor treatment/);
  assert.match(msg, /September 15, 2026/);
  assert.match(msg, /Morning/);
  assert.match(msg, /Dana Reyes/);
  assert.match(msg, /773-555-0134/);
  assert.match(msg, /Hyde Park/);
  assert.match(msg, /\$150–250/); // 120-200 + 30-50
});

test("message names the weekday so a wrong date is obvious to the customer", () => {
  assert.match(B.buildMessage(baseSel), /Tuesday, September 15, 2026/);
});

test("carpet requests route to the carpet line, move-outs to the property line", () => {
  assert.ok(B.smsHref(baseSel).startsWith("sms:+17739566249"));
  const mo = { ...baseSel, service: "moveout", units: 1 };
  assert.ok(B.smsHref(mo).startsWith("sms:+17734390922"));
});

test("sms body is percent-encoded — no raw spaces or newlines in the URL", () => {
  const href = B.smsHref(baseSel);
  const body = href.slice(href.indexOf("body=") + 5);
  assert.ok(!/[ \n]/.test(body), "unencoded whitespace would truncate the body");
  assert.match(body, /%0A/, "newlines survive as %0A");
  assert.equal(decodeURIComponent(body), B.buildMessage(baseSel));
});

test("mailto carries a subject and decodes back to the same message", () => {
  const href = B.mailtoHref(baseSel);
  assert.ok(href.startsWith("mailto:mrpurecarpetcleaning@gmail.com"));
  const url = new URL(href);
  assert.match(url.searchParams.get("subject"), /Carpet cleaning/);
  assert.equal(url.searchParams.get("body"), B.buildMessage(baseSel));
});

test("an apostrophe in the greeting does not break encoding", () => {
  assert.match(B.buildMessage(baseSel), /I'd like to book/);
  assert.equal(
    decodeURIComponent(B.smsHref(baseSel).split("body=")[1]),
    B.buildMessage(baseSel)
  );
});

test("missing date and time degrade to a dash instead of 'undefined'", () => {
  const msg = B.buildMessage({ service: "carpet", pkg: "1br" });
  assert.match(msg, /Preferred date: —/);
  assert.match(msg, /Preferred time: —/);
  assert.ok(!/undefined/.test(msg));
});
