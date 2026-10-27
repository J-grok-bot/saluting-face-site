// Minimal progressive enhancement. The site works fully without JS.
// Each feature runs in its own guard so one failure can't stop the others.
function safe(fn) { try { return fn(); } catch (e) { if (window.console) console.error(e); } }
var y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

// Hero salute: hover / focus / tap the ASCII face and it re-salutes.
// Each frame keeps the same 21 rows of the "saluting-face" text stream;
// only the "=" arm runs move. Every row is padded to 30 columns so nothing shifts.
safe(function () {
  var art = document.querySelector('.ascii');
  if (!art) return;
  var rows = art.querySelectorAll('.l');
  // Width reserved for the peak pose (hand shifted 7 cols right); row 0 in the HTML is padded to 37.
  var W = 37;
  // Base letters (the art with every `=` removed) and the hand: one rigid `=` sprite, [row, startCol, endCol] at rest.
  var TEXT = ["salut", "ing-face-s", "aluting-face-", "saluting-face-s", "aluting-f", "ace-salu", "ting-face", "-salu   ti", "ng-f     ace-sa", "luti     ng-face-salu", "ting    -face-salutin", "g-face -saluting-face", "-saluting-face-salut", "ing-face-saluting-fa", "ce-saluting-face-sa", "          luting-f", "ace-saluting-face", "-saluting-face-", "saluting-face", "-saluting-", "face-s"];
  var HAND = [[4, 11, 13], [5, 10, 21], [6, 10, 28], [7, 13, 29], [8, 22, 29]];
  if (rows.length !== TEXT.length) return;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  // Frame = base letters + the hand stamped at (dr, dc); `=` overwrites any letters underneath.
  // No rotation, translation only.
  function draw(dr, dc) {
    dr = dr || 0; dc = dc || 0;
    var grid = TEXT.map(function (t) { return (t + new Array(W + 1).join(' ')).slice(0, W).split(''); });
    HAND.forEach(function (h) {
      var r = h[0] + dr;
      if (r < 0 || r >= grid.length) return;
      for (var c = h[1] + dc; c <= h[2] + dc; c++) if (c >= 0 && c < W) grid[r][c] = '=';
    });
    for (var i = 0; i < rows.length; i++) {
      rows[i].innerHTML = grid[i].join('').replace(/=+/g, '<b class="eq">$&</b>');
    }
  }

  // Path of the hand, one row/col step per frame, along an arc through Justin's waypoints:
  // in-between (-2 rows, +3 cols) and peak (-3 rows, +7 cols). [dr, dc, hold ms, flash?]
  // Quick rise (eased out), brief hang at the peak, snappy drop onto the brow, yellow flash on landing.
  var SEQ = [
    [-1, 1, 30], [-2, 2, 30], [-2, 3, 35],             // lift off the brow -> in-between
    [-3, 4, 40], [-3, 5, 45], [-3, 6, 55], [-3, 7, 95], // ease out into the peak, hang
    [-3, 6, 35], [-2, 5, 30], [-2, 4, 25], [-2, 3, 22], // back through the in-between...
    [-1, 2, 20], [-1, 1, 18],                           // ...snapping down
    [0, 0, 150, 'flash'],                               // land on the brow: flash
    [0, 0, 0]
  ];
  var playing = false;

  function salute() {
    if (playing || reduce.matches) return;
    playing = true;
    art.classList.add('is-saluting');
    var k = 0;
    (function step() {
      var f = SEQ[k];
      draw(f[0], f[1]);
      art.classList.toggle('is-flash', f[3] === 'flash');
      if (++k < SEQ.length) { setTimeout(step, f[2]); }
      else { art.classList.remove('is-saluting'); playing = false; }
    })();
  }

  art.addEventListener('mouseenter', salute);
  art.addEventListener('focus', salute);
  art.addEventListener('click', salute);
  art.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); salute(); }
  });
  window.__salute = { draw: draw, seq: SEQ, play: salute };
});

// Boot sequence: the hero copy types itself in, char by char, after the ASCII starts fading in.
// The full text is already laid out (chars are just transparent), so nothing shifts,
// and the real text stays in the DOM for search engines and screen readers.
window.__boot = safe(function () {
  var root = document.documentElement;
  var copy = document.querySelector('.hero__copy');
  var api = { running: false, finish: function () {} };
  if (!copy || !root.classList.contains('boot')) return api;
  var targets = [copy.querySelector('.wordmark'), copy.querySelector('.pitch'), copy.querySelector('.prompt')];
  // buttons don't type: they slide up + fade in as the tagline finishes
  var btns = [].slice.call(copy.querySelectorAll('.hero__actions .btn'));
  btns.forEach(function (b) { b.classList.add('pend'); });
  var BTN_STAGGER = 100, BTN_DUR = 420, btnTimers = [];
  var queue = []; // [{el, chars:[span...]}]
  targets.forEach(function (t) {
    if (!t) return;
    var chars = [], walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (p.closest('.typed, .cursor') || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < node.nodeValue.length; i++) {
        var s = document.createElement('span');
        s.className = 'ch pend';
        s.textContent = node.nodeValue[i];
        frag.appendChild(s); chars.push(s);
      }
      node.parentNode.replaceChild(frag, node);
    });
    queue.push({ el: t, chars: chars });
  });
  copy.classList.add('typing');
  root.classList.remove('boot');
  api.running = true;

  // Build an irregular per-char schedule, then scale it to ~2s of typing (+ ~0.5s for the buttons).
  var steps = [], t = 0;
  function delayFor(ch) {
    var d = 7 + Math.random() * 16;              // irregular, like real typing
    if (ch === ' ') d += 8 + Math.random() * 18;
    if (/[,.·]/.test(ch)) d += 45 + Math.random() * 40;
    if (Math.random() < 0.05) d += 50;           // the odd hesitation
    return d;
  }
  queue.forEach(function (item, k) {
    if (k) t += 110 + Math.random() * 60;        // move to the next line
    item.chars.forEach(function (s, j) { t += delayFor(s.textContent); steps.push({ t: t, s: s, el: j === 0 ? item.el : null }); });
  });
  var scale = 2000 / t, START = 550, t0 = null, idx = 0, at = null, raf = null, timer = null;
  function mark(s) { if (at) at.classList.remove('at'); at = s; if (s) s.classList.add('at'); }
  function done() {
    clearTimeout(timer); if (raf) cancelAnimationFrame(raf); mark(null);
    btnTimers.forEach(clearTimeout);
    copy.querySelectorAll('.ch.pend').forEach(function (s) { s.classList.remove('pend'); });
    copy.querySelectorAll('.btn.pend').forEach(function (b) { b.classList.remove('pend'); });
    copy.classList.remove('typing');
    api.running = false;
  }
  function frame(now) {
    if (t0 === null) t0 = now;
    var el = now - t0, last = null;
    while (idx < steps.length && steps[idx].t * scale <= el) {
      var st = steps[idx++];
      if (st.el) st.el.classList.remove('pend');
      st.s.classList.remove('pend'); last = st.s;
    }
    if (last) mark(last);
    if (idx >= steps.length) {
      // tagline done: release the buttons (staggered), park the cursor, then tidy up once they've landed
      btns.forEach(function (b, i) {
        if (!i) b.classList.remove('pend');
        else btnTimers.push(setTimeout(function () { b.classList.remove('pend'); }, i * BTN_STAGGER));
      });
      btnTimers.push(setTimeout(function () { mark(null); copy.classList.remove('typing'); }, 140));
      timer = setTimeout(done, (btns.length - 1) * BTN_STAGGER + BTN_DUR + 20);
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  timer = setTimeout(function () { raf = requestAnimationFrame(frame); }, START); // ASCII rows begin fading at 150ms; join mid-boot
  api.finish = done;
  return api;
});

// Easter egg: keystrokes anywhere on the page land at the hero prompt cursor.
safe(function () {
  var prompt = document.querySelector('.prompt');
  var out = prompt && prompt.querySelector('.typed');
  var sink = prompt && prompt.querySelector('.typed-sink');
  if (!out) return;
  var MAX = 1000, buf = '', started = false;
  function render() { out.textContent = buf ? ' ' + buf : ''; }
  function add(str) {
    str = str.replace(/[\r\n\t]/g, ' ');
    if (!str) return;
    started = true;
    if (buf.length >= MAX) return;          // past the cap, further keys are ignored
    buf = (buf + str).slice(0, MAX);
    render();
  }
  function isField(el) {
    if (!el || el === sink) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
  }
  function isControl(el) {
    return el && el !== document.body && (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button');
  }
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    var el = e.target;
    if (el === sink || isField(el)) return;
    if (window.__boot && window.__boot.running) window.__boot.finish(); // first key skips the intro
    var k = e.key;
    if (k.length !== 1) return;              // Enter, Backspace, Escape, arrows, Tab...: typed text is append-only
    if (k === ' ') {
      if (!started || isControl(el)) return; // leave Space alone until typing starts
      e.preventDefault();
    }
    add(k);
  });
  // touch: a silent tap on the line opens the keyboard via an invisible input
  if (sink) {
    prompt.addEventListener('click', function () { try { sink.focus({ preventScroll: true }); } catch (_) { sink.focus(); } });
    sink.addEventListener('beforeinput', function (e) {
      var t = e.inputType || '';
      e.preventDefault();
      if (t.indexOf('insert') === 0 && t !== 'insertLineBreak' && t !== 'insertParagraph' && e.data) add(e.data);
    });
    sink.addEventListener('input', function () { if (sink.value) { add(sink.value); sink.value = ''; } });
    sink.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') e.preventDefault();
    });
  }
});

// Text rain: "saluting-face" (with the odd o7 / _o)7) falling in a small masked bubble behind the hero text block.
// Decorative only: canvas sits behind the art (z-index -1), ignores pointer events, ~24fps,
// pauses offscreen / in hidden tabs, and is a single static faint frame under reduced motion.
safe(function () {
  var c = document.querySelector('.rain');
  if (!c || !c.getContext) return;
  var ctx = c.getContext('2d');
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var WORD = 'saluting-face-', FPS_MS = 1000 / 24;
  var dpr = 1, w = 0, h = 0, fs = 14, rows = 0, cols = [], visible = true, raf = null, last = 0;
  var font = '700 ' + fs + 'px ' + (getComputedStyle(document.body).fontFamily || 'monospace');

  function stream() {                       // a column's text: the brand stream, occasionally saluting
    var s = '', k = (Math.random() * WORD.length) | 0;
    while (s.length < 160) {
      var r = Math.random();
      if (r < 0.06) s += ' o7 ';
      else if (r < 0.09) s += ' _o)7 ';
      else s += WORD.slice(k) + WORD.slice(0, k);
      k = 0;
    }
    return s;
  }
  function newCol(x, scatter) {
    return { x: x, y: scatter ? -Math.random() * rows * 1.5 : -Math.random() * rows * 0.6,
             v: 0.35 + Math.random() * 0.55, s: stream(), k: (Math.random() * 40) | 0, lastRow: -1 };
  }
  function size() {
    var r = c.getBoundingClientRect();
    if (!r.width) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    fs = w < 360 ? 11 : 14;
    font = '700 ' + fs + 'px ' + (getComputedStyle(document.body).fontFamily || 'monospace');
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = font; ctx.textBaseline = 'top';
    rows = Math.ceil(h / fs) + 1;
    var cw = fs * 0.6 * 1.6, n = Math.floor(w / cw);
    cols = [];
    for (var i = 0; i < n; i++) cols.push(newCol(i * cw + (w - n * cw) / 2 + cw * 0.2, true));
    return true;
  }
  function glyph(col, row) { return col.s.charAt((col.k + row) % col.s.length); }
  function step() {
    // fade what's there (transparent canvas, so erase instead of painting over)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];
      col.y += col.v;
      var row = Math.floor(col.y);
      if (row !== col.lastRow && row >= 0) {
        if (col.lastRow >= 0) {           // previous lead becomes dim trail
          ctx.clearRect(col.x - 1, col.lastRow * fs, fs * 0.8, fs);
          ctx.fillStyle = 'rgba(255,194,51,0.3)';
          ctx.fillText(glyph(col, col.lastRow), col.x, col.lastRow * fs);
        }
        ctx.fillStyle = 'rgba(255,214,110,0.9)';   // brighter yellow lead
        ctx.fillText(glyph(col, row), col.x, row * fs);
        col.lastRow = row;
      }
      if (row > rows + 4) cols[i] = newCol(col.x, false);
    }
  }
  function frame(t) {
    raf = null;
    if (!visible || document.hidden || mq.matches) return;
    if (t - last >= FPS_MS) { last = t; step(); }
    raf = requestAnimationFrame(frame);
  }
  function run() { if (!raf && visible && !document.hidden && !mq.matches) raf = requestAnimationFrame(frame); }
  function staticFrame() {                 // reduced motion: one faint, still frame
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,194,51,0.15)';
    cols.forEach(function (col) {
      var top = (Math.random() * rows) | 0, len = 4 + ((Math.random() * 10) | 0);
      for (var r = top; r < top + len && r < rows; r++) ctx.fillText(glyph(col, r), col.x, r * fs);
    });
  }
  function start() {
    if (!size()) return;
    if (mq.matches) staticFrame();
    else { for (var i = 0; i < 30; i++) step(); run(); }  // pre-roll so it fades in already raining
    requestAnimationFrame(function () { c.classList.add('on'); });
  }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (size()) { if (mq.matches) staticFrame(); else for (var i = 0; i < 30; i++) step(); } }, 150); });
  document.addEventListener('visibilitychange', run);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; run(); }).observe(c);
  }
  if (mq.addEventListener) mq.addEventListener('change', function () { if (mq.matches) staticFrame(); else run(); });
  // fade in with the boot: ASCII rows start revealing at ~150ms, copy types from ~550ms
  setTimeout(function () {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start); else start();
  }, mq.matches ? 0 : 350);
});


/* roll call: bots standing on the bottom edge of the page + a faint agent check-in log */
safe(function () {
  var botsEl = document.querySelector('.bots');
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  // every frame is 3 rows x 7 cols so nothing shifts
  var EASE = ' [o_o] \n /|_|\\ \n  / \\  ';
  var SALUTE = ' [o_o]<b>7</b>\n /|_|  \n  / \\  ';

  if (botsEl) {
    var bots = [], near = [], ground = botsEl.parentNode;
    var build = function () {
      var fs = parseFloat(getComputedStyle(botsEl).fontSize) || 14, ch = fs * 0.6;
      var n = Math.max(3, Math.min(16, Math.floor((botsEl.clientWidth + 2 * ch) / (9 * ch))));
      if (n === bots.length) return;
      botsEl.textContent = ''; bots = [];
      for (var i = 0; i < n; i++) {
        var p = document.createElement('pre');
        p.className = 'bot'; p.innerHTML = EASE; p._hover = false; p._until = 0; p._up = false;
        botsEl.appendChild(p); bots.push(p);
      }
    };
    var render = function (p) {
      var up = p._hover || p._until > Date.now();
      if (up === p._up) return;
      p._up = up; p.innerHTML = up ? SALUTE : EASE;
      if (up) { p.classList.add('flash'); setTimeout(function () { p.classList.remove('flash'); }, 140); }
    };
    var pulse = function (p, delay, hold) {          // salute briefly (wave / tap)
      setTimeout(function () {
        p._until = Date.now() + hold; render(p);
        setTimeout(function () { render(p); }, hold + 10);
      }, delay);
    };
    var wave = function () { if (!mq.matches) bots.forEach(function (p, i) { pulse(p, i * 100, 420); }); };
    var nearest = function (x) {
      return bots.map(function (p) { var r = p.getBoundingClientRect(); return [Math.abs(r.left + r.width / 2 - x), p]; })
        .sort(function (a, b) { return a[0] - b[0]; }).slice(0, 3).map(function (a) { return a[1]; });
    };
    var setHover = function (list) {          // list: bots that should be up
      bots.forEach(function (p) {
        var on = list.indexOf(p) >= 0;
        if (on) { clearTimeout(p._drop); p._drop = 0; if (!p._hover) { p._hover = true; render(p); } }
        else if (p._hover && !p._drop) {
          p._drop = setTimeout(function () { p._drop = 0; p._hover = false; render(p); }, 150);
        }
      });
    };
    var inZone = function (y) {            // the bot row, plus a band just above it
      var r = botsEl.getBoundingClientRect();
      return r.bottom > 0 && y >= r.top - 120 && y <= r.bottom + 40;
    };
    if (!mq.matches) {
      document.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        setHover(inZone(e.clientY) ? nearest(e.clientX) : []);
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', function () { setHover([]); });
      window.addEventListener('blur', function () { setHover([]); });
      document.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' || !inZone(e.clientY)) return;
        nearest(e.clientX).forEach(function (p) { pulse(p, 0, 650); });
      }, { passive: true });
    }
    build();
    window.addEventListener('resize', build);
    if ('IntersectionObserver' in window) {
      // stadium wave once per entry, when ~40% of the row is in view
      var seen = false;
      try { new IntersectionObserver(function (es) {
        var e = es[es.length - 1];
        if (e.intersectionRatio >= 0.4) { if (!seen) { seen = true; wave(); } }
        else if (!e.isIntersecting) seen = false;
      }, { threshold: [0, 0.4] }).observe(botsEl); } catch (e) { wave(); }
    }
    window.__rollcall = { wave: wave, bots: function () { return bots; }, nearest: nearest };
  }

  // crew.log: a terminal chat window playing one scripted story, start to finish:
  // check-ins -> op live -> coordination -> phase two -> objective secured -> stand-down -> connection closed.
  // It only advances while on screen in a visible tab, and stops at the end (restarts on reload).
  var log = document.querySelector('.crewlog');
  if (!log) return;
  var box = log.querySelector('.crewlog__lines'), win = log.querySelector('.crewlog__win');
  var SCRIPT = ["[agent-01] online.",
    "[agent-07] on station. o7",
    "[agent-03] comms up.",
    "[agent-12] boots on.",
    "[agent-05] present and accounted for. o7",
    "[agent-11] standing by.",
    "[agent-09] ready.",
    "[agent-02] checked in. coffee optional.",
    "[agent-14] in position. o7",
    "[agent-07] -> [agent-03] good to hear you, 03.",
    "[agent-03] -> [agent-07] likewise. quiet night?",
    "[agent-07] for now.",
    "[agent-08] eyes open.",
    "[agent-17] systems nominal.",
    "[agent-21] here. what did i miss?",
    "[agent-12] -> [agent-21] nothing yet. grab a seat.",
    "[agent-06] reporting for duty. o7",
    "[agent-19] late, but here.",
    "[agent-04] on post.",
    "[agent-10] online and caffeinated. o7",
    "[ops] roll call complete. sixteen of sixteen.",
    "[ops] op ███ is live. stay off open channels.",
    "[agent-05] wilco.",
    "[agent-14] wilco. o7",
    "[ops] -> [agent-03] you have lead on the package.",
    "[agent-03] copy. taking lead.",
    "[agent-03] -> [agent-11] pkg staged. awaiting go.",
    "[agent-11] -> [agent-03] copy. go on my mark.",
    "[agent-07] sector 4 indexed. no contacts.",
    "[agent-02] -> [agent-07] confirm sector 5?",
    "[agent-07] -> [agent-02] sector 5 clear as well.",
    "[agent-11] mark.",
    "[agent-03] package moving.",
    "[agent-12] -> [agent-09] need eyes on the brief.",
    "[agent-09] -> [agent-12] brief is [REDACTED]. need-to-know.",
    "[agent-12] understood.",
    "[agent-21] -> [ops] status on op ███?",
    "[ops] -> [agent-21] objective remains classified. proceed.",
    "[agent-21] proceeding.",
    "[agent-05] drafts in the drop. ██ eyes only.",
    "[agent-17] -> [agent-05] pulled. reviewing now.",
    "[agent-08] cache warm. queue at zero.",
    "[agent-19] -> [agent-08] nice work.",
    "[agent-17] -> [agent-05] two edits. sending back.",
    "[agent-05] got em. thanks, 17. o7",
    "[agent-06] -> [agent-04] route ██ is noisy. taking the long way.",
    "[agent-04] -> [agent-06] copy. eta?",
    "[agent-06] ninety seconds.",
    "[agent-10] handoff complete. checksum green.",
    "[agent-02] -> [agent-10] received. verifying.",
    "[agent-02] verified.",
    "[agent-14] -> [agent-01] sync at 0400?",
    "[agent-01] -> [agent-14] 0400 works.",
    "[agent-09] make that two.",
    "[agent-06] on site. quiet out here.",
    "[agent-04] -> [agent-06] drop point moved.",
    "[agent-06] -> [agent-04] new grid?",
    "[agent-04] [REDACTED].",
    "[agent-06] on it.",
    "[agent-19] -> [agent-11] who signed off on [REDACTED]?",
    "[agent-11] -> [agent-19] above both our pay grades.",
    "[agent-19] fair.",
    "[agent-03] package at waypoint two.",
    "[agent-11] -> [agent-03] conditions?",
    "[agent-03] clear. green across the board.",
    "[agent-17] docs indexed. flags routed to ██.",
    "[agent-08] -> [agent-17] taking the flags.",
    "[agent-12] -> [agent-10] you have the conn.",
    "[agent-10] i have the conn.",
    "[ops] all stations: phase two authorized.",
    "[agent-03] wilco. moving to final approach.",
    "[agent-11] wilco.",
    "[agent-09] wilco. o7",
    "[agent-07] perimeter holding.",
    "[agent-21] -> [agent-03] window closes in two.",
    "[agent-03] -> [agent-21] plenty.",
    "[agent-02] all checksums green.",
    "[ops] package is go. repeat, package is go.",
    "[agent-03] package delivered.",
    "[agent-03] -> [ops] objective secured. ███ ███ ███.",
    "[ops] confirmed. good work, everyone.",
    "[agent-11] o7",
    "[agent-05] that's a wrap. o7",
    "[agent-14] -> [agent-01] see you at 0400. o7",
    "[agent-01] -> [agent-14] wouldn't miss it.",
    "[agent-12] logging off. o7",
    "[agent-19] next round's on 21.",
    "[agent-21] -> [agent-19] noted. o7",
    "[agent-07] clean sweep. signing off.",
    "[agent-09] o7",
    "[agent-17] o7",
    "[ops] op ███ complete. all units stand down. o7"];
  var rnd = function (n) { return Math.floor(Math.random() * n); };
  // fake clock: starts somewhere in the afternoon, ticks forward a few seconds per message
  var clock = (13 * 3600) + rnd(5 * 3600);
  function stamp() {
    clock += 2 + rnd(7);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(Math.floor(clock / 3600) % 24) + ':' + p(Math.floor(clock / 60) % 60) + ':' + p(clock % 60);
  }
  // "[agent-03] -> [agent-11] pkg staged." -> [[class, text], ...]
  function tokens(line) {
    var out = [], m = /^\[(agent-\d+|ops)\]\s*/.exec(line);
    if (m) { out.push([m[1] === 'ops' ? 'who ops' : 'who', m[1]]); out.push(['', ' ']); line = line.slice(m[0].length); }
    var d = /^->\s*\[(agent-\d+|ops)\]\s*/.exec(line);
    if (d) { out.push(['arw', '-> ']); out.push(['to', d[1]]); out.push(['', ' ']); line = line.slice(d[0].length); }
    var o7 = /(^| )o7$/.test(line); if (o7) line = line.replace(/ ?o7$/, '');
    line.split(/(\[REDACTED\]|█+(?: █+)*)/).forEach(function (part, i) { if (part) out.push([i % 2 ? 'red' : '', part]); });
    if (o7) { if (line) out.push(['', ' ']); out.push(['o7', 'o7']); }
    return out;
  }
  var prompt = document.createElement('div');                 // the waiting cursor row, always last
  prompt.className = 'crewlog__line crewlog__prompt';
  prompt.innerHTML = '<span class="ts">        </span><span class="msg"><span class="cur"></span></span>';
  box.appendChild(prompt);
  var MAXROWS = 18;
  function row(ts, build) {
    var r = document.createElement('div'), t = document.createElement('span'), msg = document.createElement('span');
    r.className = 'crewlog__line'; t.className = 'ts'; msg.className = 'msg';
    t.textContent = ts; build(msg); r.appendChild(t); r.appendChild(msg);
    box.insertBefore(r, prompt);
    while (box.children.length > MAXROWS) box.removeChild(box.firstChild);   // bounded DOM
    return r;
  }
  function message(line) {
    return row(stamp(), function (msg) {
      tokens(line).forEach(function (t) {
        var s = document.createElement('span'); if (t[0]) s.className = t[0]; s.textContent = t[1]; msg.appendChild(s);
      });
    });
  }
  function closed() { var r = row('', function (msg) { msg.className = 'msg end'; msg.textContent = '-- connection closed --'; }); return r; }
  function glide(r) {                                           // new row fades/rises in; the stack slides up smoothly
    var h = r.offsetHeight;
    box.style.transition = 'none'; box.style.transform = 'translateY(' + h + 'px)';
    void box.offsetHeight;
    box.style.transition = ''; box.style.transform = '';
    r.classList.add('in');
  }

  var idx = 0, vis = true, timer = 0, done = false;
  function show() {
    timer = 0;
    if (done || !vis || document.hidden) return;                // resumes via sync()
    if (idx < SCRIPT.length) {
      var line = SCRIPT[idx++];
      glide(message(line));
      var n = line.replace(/^\[[^\]]+\]\s*(->\s*\[[^\]]+\]\s*)?/, '').length;
      var wait = n < 16 ? 1500 + rnd(700) : 1900 + n * 26 + rnd(800);  // ~2-3s; quick acks faster, long lines slower
      timer = setTimeout(show, idx < SCRIPT.length ? wait : 1600);
    } else {
      glide(closed()); done = true; log.classList.add('done');
    }
  }
  function sync() { if (!done && !mq.matches && !timer && vis && !document.hidden) timer = setTimeout(show, 700); }
  if (mq.matches) {                                             // reduced motion: the ending, static
    SCRIPT.slice(-7).forEach(message); closed(); done = true;
  } else sync();
  document.addEventListener('visibilitychange', function () { if (document.hidden && timer) { clearTimeout(timer); timer = 0; } sync(); });
  if ('IntersectionObserver' in window) {
    try {
      new IntersectionObserver(function (es) {
        vis = es[es.length - 1].isIntersecting;
        if (!vis && timer) { clearTimeout(timer); timer = 0; }
        sync();
      }).observe(win);
    } catch (e) {}
  }
  window.__crewlog = { script: SCRIPT, box: box, state: function () { return { idx: idx, done: done }; } };
});
