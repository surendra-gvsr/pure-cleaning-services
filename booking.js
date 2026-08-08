/* =========================================================
   Pure Cleaning Services — booking request builder
   Vanilla JS, no dependencies, no build step.

   IMPORTANT: this is a REQUEST builder, not a reservation
   system. GitHub Pages is static hosting — there is no server
   and no database, so nothing here can check real availability
   or hold a slot. It collects the details, prices them from the
   published price list, and hands off to SMS or email so
   Chantelle & Robert confirm the slot personally.
   ========================================================= */
(function (global) {
  "use strict";

  /* ---------------------------------------------------------
     Pricing — mirrors the printed price list in index.html.
     Every entry is a [min, max] range in whole dollars.
     --------------------------------------------------------- */
  var PRICES = {
    carpetPackage: {
      "1br": [80, 150],
      "2br": [120, 200],
      "3br": [180, 300]
    },
    carpetRoom: {
      smallRoom:  [30, 50],
      bedroom:    [40, 60],
      livingRoom: [50, 80],
      hallway:    [15, 30],
      stairs:     [40, 75]
    },
    carpetAddon: {
      petOdor:    [30, 50],
      stain:      [40, 60],
      deodorizer: [20, 40],
      furniture:  [20, 40]
    },
    moveoutFlat: {
      1: [200, 200],
      2: [400, 400]
    },
    moveoutAddon: {
      fridge:     [25, 25],
      oven:       [25, 25],
      cabinets:   [20, 20],
      windows:    [5, 10],
      petHair:    [30, 75],
      heavyTrash: [50, 150]
    }
  };

  var TIME_WINDOWS = {
    morning:   "Morning (8:00 – 11:00 AM)",
    midday:    "Midday (11:00 AM – 2:00 PM)",
    afternoon: "Afternoon (2:00 – 5:00 PM)",
    evening:   "Evening (5:00 – 7:00 PM)"
  };

  var CONTACT = {
    carpet:  { tel: "+17739566249", display: "773-956-6249" },
    moveout: { tel: "+17734390922", display: "773-439-0922" },
    email:   "mrpurecarpetcleaning@gmail.com"
  };

  var BOOKING_HORIZON_DAYS = 90;
  var CLOSED_WEEKDAYS = [0]; // 0 = Sunday. Closed.

  var MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
  var DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday",
                   "Thursday", "Friday", "Saturday"];

  /* ---------------------------------------------------------
     Date helpers.

     All arithmetic is done on LOCAL dates via the
     (year, month, day) Date constructor. We never touch
     toISOString() / UTC here — that shifts the date backwards
     for anyone west of UTC (Chicago is UTC-5/-6), which would
     let customers book a day that already passed.
     --------------------------------------------------------- */
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function sameDate(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  function firstBookableDate(today) {
    // Earliest request is tomorrow. Same-day work is a phone call,
    // not a form — a request sent at 9pm for "today" is meaningless.
    return addDays(startOfDay(today), 1);
  }

  function lastBookableDate(today) {
    return addDays(startOfDay(today), BOOKING_HORIZON_DAYS);
  }

  function isClosedWeekday(date) {
    return CLOSED_WEEKDAYS.indexOf(date.getDay()) !== -1;
  }

  function isDateAvailable(date, today) {
    var d = startOfDay(date);
    if (d < firstBookableDate(today)) return false;
    if (d > lastBookableDate(today)) return false;
    return !isClosedWeekday(d);
  }

  function formatDateLong(d) {
    return DAYS_LONG[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " +
           d.getDate() + ", " + d.getFullYear();
  }

  function formatMonthLabel(year, month) {
    return MONTHS[month] + " " + year;
  }

  /**
   * Weeks (Sunday-first) covering the given month.
   * Returns an array of 7-length arrays. Cells outside the
   * month are null so the grid keeps its shape.
   */
  function monthMatrix(year, month) {
    var first = new Date(year, month, 1);
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var lead = first.getDay();
    var cells = [];
    var i;

    for (i = 0; i < lead; i++) cells.push(null);
    for (i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
    while (cells.length % 7 !== 0) cells.push(null);

    var weeks = [];
    for (i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }

  /* ---------------------------------------------------------
     Estimate
     --------------------------------------------------------- */
  function addRange(total, range, qty) {
    var n = qty == null ? 1 : qty;
    return [total[0] + range[0] * n, total[1] + range[1] * n];
  }

  /**
   * @param {object} sel
   *   service    "carpet" | "moveout"
   *   pkg        key of PRICES.carpetPackage, or "rooms"
   *   rooms      { smallRoom, bedroom, livingRoom, hallway, stairs } counts
   *   addons     array of add-on keys
   *   windows    count, move-out interior windows
   *   units      number of apartments (move-out)
   * @returns {{min:number,max:number,callForRate:boolean,openEnded:boolean}}
   */
  function estimate(sel) {
    var total = [0, 0];
    var callForRate = false;
    var openEnded = false;
    var addons = sel.addons || [];
    var i, key;

    if (sel.service === "moveout") {
      var units = Number(sel.units) || 1;
      if (units >= 3) {
        // The price list stops at 2 units — 3+ is quoted by phone.
        callForRate = true;
      } else {
        total = addRange(total, PRICES.moveoutFlat[units] || PRICES.moveoutFlat[1], 1);
      }
      for (i = 0; i < addons.length; i++) {
        key = addons[i];
        if (!PRICES.moveoutAddon[key]) continue;
        if (key === "windows") {
          var wc = Number(sel.windows) || 1;
          total = addRange(total, PRICES.moveoutAddon.windows, wc);
        } else {
          total = addRange(total, PRICES.moveoutAddon[key], 1);
        }
      }
    } else {
      if (sel.pkg === "rooms") {
        var rooms = sel.rooms || {};
        for (key in PRICES.carpetRoom) {
          if (!Object.prototype.hasOwnProperty.call(PRICES.carpetRoom, key)) continue;
          var count = Number(rooms[key]) || 0;
          if (count > 0) total = addRange(total, PRICES.carpetRoom[key], count);
        }
      } else if (PRICES.carpetPackage[sel.pkg]) {
        total = addRange(total, PRICES.carpetPackage[sel.pkg], 1);
      }
      for (i = 0; i < addons.length; i++) {
        key = addons[i];
        if (!PRICES.carpetAddon[key]) continue;
        if (key === "furniture") openEnded = true; // price list says "$20+"
        total = addRange(total, PRICES.carpetAddon[key], 1);
      }
    }

    return {
      min: total[0],
      max: total[1],
      callForRate: callForRate,
      openEnded: openEnded
    };
  }

  function formatEstimate(est) {
    if (est.callForRate) return "Call for rate";
    if (est.min === 0 && est.max === 0) return "—";
    if (est.min === est.max) return "$" + est.min + (est.openEnded ? "+" : "");
    return "$" + est.min + "–" + est.max + (est.openEnded ? "+" : "");
  }

  /* ---------------------------------------------------------
     Message
     --------------------------------------------------------- */
  var ROOM_LABELS = {
    smallRoom: "Small room", bedroom: "Bedroom",
    livingRoom: "Large living room", hallway: "Hallway",
    stairs: "Stairs (flight)"
  };
  var ADDON_LABELS = {
    petOdor: "Pet odor treatment", stain: "Heavy stain treatment",
    deodorizer: "Deodorizer / disinfectant", furniture: "Furniture moving",
    fridge: "Inside refrigerator", oven: "Inside oven",
    cabinets: "Inside cabinets", windows: "Interior windows",
    petHair: "Pet hair removal", heavyTrash: "Heavy trash / excessive dirt"
  };
  var PKG_LABELS = {
    "1br": "1 bedroom — whole home", "2br": "2 bedroom — whole home",
    "3br": "3 bedroom — whole home", rooms: "Room by room"
  };

  function buildMessage(sel) {
    var lines = [];
    var est = estimate(sel);
    var i, key;

    lines.push("Hi Pure Cleaning — I'd like to book:");
    lines.push("");
    lines.push("Service: " + (sel.service === "moveout"
      ? "Move-out cleaning" : "Carpet cleaning"));

    if (sel.service === "moveout") {
      var units = Number(sel.units) || 1;
      lines.push("Apartments: " + units);
    } else {
      lines.push("Size: " + (PKG_LABELS[sel.pkg] || "—"));
      if (sel.pkg === "rooms") {
        var rooms = sel.rooms || {};
        for (key in ROOM_LABELS) {
          if (!Object.prototype.hasOwnProperty.call(ROOM_LABELS, key)) continue;
          var c = Number(rooms[key]) || 0;
          if (c > 0) lines.push("  - " + ROOM_LABELS[key] + " x" + c);
        }
      }
    }

    var addons = sel.addons || [];
    if (addons.length) {
      lines.push("Add-ons:");
      for (i = 0; i < addons.length; i++) {
        key = addons[i];
        var label = ADDON_LABELS[key] || key;
        if (key === "windows") label += " x" + (Number(sel.windows) || 1);
        lines.push("  - " + label);
      }
    }

    lines.push("");
    lines.push("Preferred date: " + (sel.date ? formatDateLong(sel.date) : "—"));
    lines.push("Preferred time: " + (TIME_WINDOWS[sel.timeWindow] || "—"));
    lines.push("Estimate from your price list: " + formatEstimate(est));

    lines.push("");
    if (sel.name)    lines.push("Name: " + sel.name);
    if (sel.phone)   lines.push("Phone: " + sel.phone);
    if (sel.address) lines.push("Address / neighborhood: " + sel.address);
    if (sel.notes)   lines.push("Notes: " + sel.notes);

    return lines.join("\n");
  }

  function smsHref(sel) {
    var num = CONTACT[sel.service === "moveout" ? "moveout" : "carpet"].tel;
    // "?&body=" is the form that works across iOS and Android.
    return "sms:" + num + "?&body=" + encodeURIComponent(buildMessage(sel));
  }

  function mailtoHref(sel) {
    var subject = "Booking request — " +
      (sel.service === "moveout" ? "Move-out cleaning" : "Carpet cleaning") +
      (sel.date ? " — " + formatDateLong(sel.date) : "");
    return "mailto:" + CONTACT.email +
           "?subject=" + encodeURIComponent(subject) +
           "&body=" + encodeURIComponent(buildMessage(sel));
  }

  /* Public surface — also what the test suite drives. */
  var api = {
    PRICES: PRICES,
    TIME_WINDOWS: TIME_WINDOWS,
    CONTACT: CONTACT,
    BOOKING_HORIZON_DAYS: BOOKING_HORIZON_DAYS,
    startOfDay: startOfDay,
    addDays: addDays,
    sameDate: sameDate,
    firstBookableDate: firstBookableDate,
    lastBookableDate: lastBookableDate,
    isDateAvailable: isDateAvailable,
    formatDateLong: formatDateLong,
    formatMonthLabel: formatMonthLabel,
    monthMatrix: monthMatrix,
    estimate: estimate,
    formatEstimate: formatEstimate,
    buildMessage: buildMessage,
    smsHref: smsHref,
    mailtoHref: mailtoHref
  };

  global.PCSBooking = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  /* =========================================================
     UI wiring — only runs in a browser with the form present.
     ========================================================= */
  if (typeof document === "undefined") return;

  function init() {
    var form = document.getElementById("bkForm");
    if (!form) return;

    var today = startOfDay(new Date());
    var view = { year: 0, month: 0 };
    var selectedDate = null;
    var focusedDate = firstBookableDate(today);

    view.year = focusedDate.getFullYear();
    view.month = focusedDate.getMonth();

    var grid      = document.getElementById("bkGrid");
    var monthEl   = document.getElementById("bkMonth");
    var prevBtn   = document.getElementById("bkPrev");
    var nextBtn   = document.getElementById("bkNext");
    var estEl     = document.getElementById("bkEstimate");
    var estNote   = document.getElementById("bkEstimateNote");
    var summaryEl = document.getElementById("bkSummary");
    var errorEl   = document.getElementById("bkError");
    var smsBtn    = document.getElementById("bkSms");
    var mailBtn   = document.getElementById("bkMail");
    var carpetFs  = document.getElementById("bkCarpetFields");
    var moveFs    = document.getElementById("bkMoveoutFields");
    var roomsWrap = document.getElementById("bkRooms");
    var winWrap   = document.getElementById("bkWindowsQty");

    function val(name) {
      var el = form.querySelector('[name="' + name + '"]:checked');
      return el ? el.value : null;
    }
    function num(id) {
      var el = document.getElementById(id);
      return el ? Number(el.value) || 0 : 0;
    }
    function text(id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : "";
    }

    function currentSelection() {
      var service = val("service") || "carpet";
      var pkg = val("pkg") || "1br";
      var addons = [];
      var boxes = form.querySelectorAll('input[name="addon"]:checked');
      var i;
      for (i = 0; i < boxes.length; i++) {
        // Only count add-ons belonging to the visible service.
        if (boxes[i].dataset.service === service) addons.push(boxes[i].value);
      }
      return {
        service: service,
        pkg: service === "carpet" ? pkg : null,
        rooms: {
          smallRoom:  num("bkSmallRoom"),
          bedroom:    num("bkBedroom"),
          livingRoom: num("bkLivingRoom"),
          hallway:    num("bkHallway"),
          stairs:     num("bkStairs")
        },
        addons: addons,
        units: num("bkUnits") || 1,
        windows: num("bkWindows") || 1,
        date: selectedDate,
        timeWindow: val("timeWindow"),
        name: text("bkName"),
        phone: text("bkPhone"),
        address: text("bkAddress"),
        notes: text("bkNotes")
      };
    }

    /* ---- calendar rendering ---- */
    function renderCalendar() {
      var weeks = monthMatrix(view.year, view.month);
      var frag = document.createDocumentFragment();
      var w, d;

      monthEl.textContent = formatMonthLabel(view.year, view.month);
      grid.innerHTML = "";

      for (w = 0; w < weeks.length; w++) {
        var row = document.createElement("div");
        row.className = "cal__row";
        row.setAttribute("role", "row");

        for (d = 0; d < 7; d++) {
          var date = weeks[w][d];
          if (!date) {
            var blank = document.createElement("span");
            blank.className = "cal__cell cal__cell--blank";
            blank.setAttribute("role", "gridcell");
            row.appendChild(blank);
            continue;
          }

          var available = isDateAvailable(date, today);
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cal__cell cal__day";
          btn.setAttribute("role", "gridcell");
          btn.textContent = String(date.getDate());
          btn.dataset.date = date.getFullYear() + "-" +
                             (date.getMonth() + 1) + "-" + date.getDate();

          if (!available) {
            btn.disabled = true;
            btn.classList.add("is-off");
            btn.setAttribute("aria-disabled", "true");
            btn.setAttribute("aria-label",
              formatDateLong(date) + " — unavailable");
          } else {
            btn.setAttribute("aria-label", formatDateLong(date));
          }

          if (selectedDate && sameDate(date, selectedDate)) {
            btn.classList.add("is-picked");
            btn.setAttribute("aria-selected", "true");
          } else {
            btn.setAttribute("aria-selected", "false");
          }

          // Roving tabindex: exactly one day is tabbable.
          btn.tabIndex = sameDate(date, focusedDate) ? 0 : -1;
          row.appendChild(btn);
        }
        frag.appendChild(row);
      }

      grid.appendChild(frag);
      syncNavButtons();
    }

    function syncNavButtons() {
      // Test the month we would land on, not the one we are showing —
      // otherwise you can page back into a month with nothing bookable.
      var prevMonthLast = new Date(view.year, view.month, 0);
      var nextMonthFirst = new Date(view.year, view.month + 1, 1);
      prevBtn.disabled = prevMonthLast < firstBookableDate(today);
      nextBtn.disabled = nextMonthFirst > lastBookableDate(today);
    }

    function showMonthOf(date) {
      view.year = date.getFullYear();
      view.month = date.getMonth();
    }

    function moveFocus(nextDate) {
      var min = firstBookableDate(today);
      var max = lastBookableDate(today);
      if (nextDate < min) nextDate = min;
      if (nextDate > max) nextDate = max;
      focusedDate = nextDate;
      showMonthOf(focusedDate);
      renderCalendar();
      var target = grid.querySelector('[tabindex="0"]');
      if (target) target.focus();
    }

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest(".cal__day");
      if (!btn || btn.disabled) return;
      var parts = btn.dataset.date.split("-");
      selectedDate = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      focusedDate = selectedDate;
      renderCalendar();
      update();
    });

    grid.addEventListener("keydown", function (e) {
      var handled = true;
      var d = focusedDate;
      switch (e.key) {
        case "ArrowLeft":  moveFocus(addDays(d, -1)); break;
        case "ArrowRight": moveFocus(addDays(d, 1));  break;
        case "ArrowUp":    moveFocus(addDays(d, -7)); break;
        case "ArrowDown":  moveFocus(addDays(d, 7));  break;
        case "Home":
          moveFocus(addDays(d, -d.getDay())); break;
        case "End":
          moveFocus(addDays(d, 6 - d.getDay())); break;
        case "PageUp":
          moveFocus(new Date(d.getFullYear(), d.getMonth() - 1, d.getDate())); break;
        case "PageDown":
          moveFocus(new Date(d.getFullYear(), d.getMonth() + 1, d.getDate())); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });

    prevBtn.addEventListener("click", function () {
      view.month -= 1;
      if (view.month < 0) { view.month = 11; view.year -= 1; }
      renderCalendar();
    });
    nextBtn.addEventListener("click", function () {
      view.month += 1;
      if (view.month > 11) { view.month = 0; view.year += 1; }
      renderCalendar();
    });

    /* ---- reactive summary + estimate ---- */
    function update() {
      var sel = currentSelection();
      var isMoveout = sel.service === "moveout";

      carpetFs.hidden = isMoveout;
      moveFs.hidden = !isMoveout;
      roomsWrap.hidden = isMoveout || sel.pkg !== "rooms";

      var winChecked = form.querySelector('input[value="windows"]:checked');
      winWrap.hidden = !isMoveout || !winChecked;

      var est = estimate(sel);
      estEl.textContent = formatEstimate(est);
      estNote.textContent = est.callForRate
        ? "Three or more units is quoted on the phone."
        : "Estimate from the published price list. We confirm the final number before we start.";

      summaryEl.textContent = sel.date
        ? formatDateLong(sel.date) +
          (sel.timeWindow ? " · " + TIME_WINDOWS[sel.timeWindow] : "")
        : "No date picked yet";

      smsBtn.href = smsHref(sel);
      mailBtn.href = mailtoHref(sel);
      return sel;
    }

    function validate(sel) {
      if (!sel.date) return "Pick a date first.";
      if (!sel.timeWindow) return "Pick a time that works for you.";
      if (!sel.name) return "Add your name so we know who we're meeting.";
      if (!sel.phone) return "Add a phone number so we can confirm.";
      return null;
    }

    function guard(e) {
      var sel = update();
      var problem = validate(sel);
      if (problem) {
        e.preventDefault();
        errorEl.textContent = problem;
        errorEl.hidden = false;
        errorEl.focus();
      } else {
        errorEl.hidden = true;
      }
    }

    smsBtn.addEventListener("click", guard);
    mailBtn.addEventListener("click", guard);
    form.addEventListener("change", update);
    form.addEventListener("input", update);
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    renderCalendar();
    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
