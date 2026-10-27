// Minimal progressive enhancement. The site works fully without JS.
var y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

// Hero salute: hover / focus / tap the ASCII face and it re-salutes.
// Each frame keeps the same 21 rows of the "saluting-face" text stream;
// only the "=" arm runs move. Every row is padded to 30 columns so nothing shifts.
(function () {
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
})();

// Boot sequence: the hero copy types itself in, char by char, after the ASCII starts fading in.
// The full text is already laid out (chars are just transparent), so nothing shifts,
// and the real text stays in the DOM for search engines and screen readers.
window.__boot = (function () {
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
})();

// Easter egg: keystrokes anywhere on the page land at the hero prompt cursor.
(function () {
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
})();

// Text rain: "saluting-face" (with the odd o7 / _o)7) falling in a small masked bubble behind the hero text block.
// Decorative only: canvas sits behind the art (z-index -1), ignores pointer events, ~24fps,
// pauses offscreen / in hidden tabs, and is a single static faint frame under reduced motion.
(function () {
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
})();


/* roll call: bots standing on the bottom edge of the page + a faint agent check-in log */
(function () {
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
      new IntersectionObserver(function (es) {
        var e = es[es.length - 1];
        if (e.intersectionRatio >= 0.4) { if (!seen) { seen = true; wave(); } }
        else if (!e.isIntersecting) seen = false;
      }, { threshold: [0, 0.4] }).observe(botsEl);
    }
    window.__rollcall = { wave: wave, bots: function () { return bots; }, nearest: nearest };
  }

  // crew.log chyron: an endless, evolving narrative. Entries are generated in JS and
  // added at the incoming edge; nodes that scroll out are trimmed so the DOM stays small.
  var chy = document.querySelector('.chyron');
  if (!chy) return;
  var track = chy.querySelector('.chyron__track'), view = chy.querySelector('.chyron__view');
  var rnd = function (n) { return Math.floor(Math.random() * n); };
  var pick = function (a) { return a[rnd(a.length)]; };
  var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var k = rnd(i + 1), t = a[i]; a[i] = a[k]; a[k] = t; } return a; };

  var CHECKIN = ['online.', 'on station.', 'standing by.', 'present and accounted for.', 'boots on.', 'comms up.', 'ready.',
    'reporting for duty.', 'on post.', 'checked in.', 'in position.', 'eyes open.', 'systems nominal.', 'awaiting orders.', 'here. what did i miss?'];
  var LATE = ['late, but here.', 'joining the net.', 'rerouted. online now.'];
  // {A} {B} {C} stay the same agents for the whole thread
  var THREADS = [
    ['{A} -> {B} pkg staged. awaiting go.', '{B} copy. go on my mark.', '{B} mark.', '{A} package moving. o7'],
    ['{A} sector 4 indexed. no contacts.', '{B} -> {A} confirm sector 5?', '{A} sector 5 clear.', '{B} copy. o7'],
    ['{A} -> {B} need eyes on the brief.', '{B} brief is [REDACTED]. need-to-know.', '{A} understood. wilco.'],
    ['{A} handoff complete. checksum green.', '{B} received. verifying.', '{B} verified. o7'],
    ['{A} -> [ops] status on op ███?', '[ops] objective remains classified. proceed.', '{A} proceeding.'],
    ['{A} -> {B} you have the conn.', '{B} i have the conn.'],
    ['{A} drafts in the drop. ██ eyes only.', '{B} pulled. reviewing.', '{B} -> {A} two edits. sending back.', '{A} got em. o7'],
    ['{A} -> {C} sync at 0400?', '{C} 0400 confirmed.', '{B} make that two.'],
    ['{A} -> {B} conditions on the objective?', '{B} clear. green across the board.'],
    ['{A} -> {B} who signed off on [REDACTED]?', '{B} above both our pay grades.', '{A} fair. o7'],
    ['{A} cache warm. queue at zero.', '{C} -> {A} nice work.'],
    ['{A} -> {B} route ██ is noisy. taking the long way.', '{B} copy. eta?', '{A} ninety seconds.'],
    ['{A} -> {B} drop point moved.', '{B} new grid?', '{A} [REDACTED].', '{B} on it.']
  ];
  var OPS_GO = ['[ops] roll call complete. op ███ is live.', '[ops] all stations: stay off open channels.'];
  var OPS_END = [
    ['[ops] all stations, phase two authorized.', '{A} wilco.', '{B} wilco.', '{C} wilco. o7'],
    ['[ops] package is go. repeat, package is go.', '{A} -> [ops] objective secured. ███ ███ ███.', '[ops] good work. stand down. o7'],
    ['[ops] shift change in 60.', '[ops] shift change. fresh crew on deck. o7']
  ];
  var tag = function (n) { return '[agent-' + (n < 10 ? '0' : '') + n + ']'; };
  var queue = [], present = [], pool = [], bag = [], phase = 0, threadsLeft = 0;
  function cast(lines) {                       // bind {A}{B}{C} to distinct agents already on the net
    var who = shuffle(present.slice()).slice(0, 3);
    return lines.map(function (l) {
      return l.replace(/\{([ABC])\}/g, function (_, k) { return tag(who['ABC'.indexOf(k)]); });
    });
  }
  function checkin(late) {
    var n; do { n = 1 + rnd(24); } while (present.indexOf(n) >= 0);
    present.push(n);
    if (!bag.length) bag = shuffle(CHECKIN.slice());
    var t = late ? pick(LATE) : bag.pop();
    return tag(n) + ' ' + t + (Math.random() < 0.45 ? ' o7' : '');
  }
  function refill() {
    if (phase === 0) {                          // roll call: varied check-ins until the crew is assembled
      present = []; var k = 7 + rnd(3);
      for (var i = 0; i < k; i++) queue.push(checkin(false));
      queue.push.apply(queue, OPS_GO); phase = 1; threadsLeft = 7; pool = shuffle(THREADS.slice());
    } else if (phase === 1) {                   // crew coordinates; two threads interleave
      var a = cast(pool.pop()), b = cast(pool.pop());
      while (a.length || b.length) {
        var src = !b.length ? a : !a.length ? b : (Math.random() < 0.6 ? a : b);
        queue.push(src.shift());
      }
      if (Math.random() < 0.4 && present.length < 20) queue.push(checkin(true));
      threadsLeft -= 2; if (threadsLeft <= 0 || pool.length < 2) phase = 2;
    } else {                                    // escalation, then a shift change loops the story
      OPS_END.forEach(function (t) { queue.push.apply(queue, cast(t)); });
      phase = 0;
    }
  }
  function next() { if (!queue.length) refill(); return queue.shift(); }
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  function fmt(line) {
    return esc(line)
      .replace(/\[(agent-\d+|ops)\]/g, '<span class="ag">[$1]</span>')
      .replace(/\[REDACTED\]|█+(?: █+)*/g, function (m) { return '<span class="red">' + m + '</span>'; })
      .replace(/\bo7$/, '<span class="o7">o7</span>');
  }
  function node(line) {
    var s = document.createElement('span');
    s.innerHTML = fmt(line) + '<span class="sep">  //  </span>';
    return s;
  }

  var dir = parseFloat(getComputedStyle(chy).getPropertyValue('--chyron-dir')) < 0 ? -1 : 1;
  var reduce = mq.matches, x = 0, w = 0, speed = 48, raf = 0, prev = 0, vis = true, hover = false;
  function fill() {                             // keep the view covered; trim what has scrolled out
    var vw = view.clientWidth, n;
    if (dir > 0) {
      while (x > -24) { n = node(next()); track.insertBefore(n, track.firstChild); x -= n.offsetWidth; w += n.offsetWidth; }
      while (track.lastChild && x + w - track.lastChild.offsetWidth > vw + 24) { w -= track.lastChild.offsetWidth; track.removeChild(track.lastChild); }
    } else {
      while (x + w < vw + 24) { n = node(next()); track.appendChild(n); w += n.offsetWidth; }
      while (track.firstChild && x + track.firstChild.offsetWidth < -24) { var fw = track.firstChild.offsetWidth; x += fw; w -= fw; track.removeChild(track.firstChild); }
    }
    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
  }
  function frame(now) {
    raf = 0;
    if (!vis || document.hidden || hover) return;
    var dt = prev ? Math.min(100, now - prev) : 0; prev = now;
    x += dir * speed * dt / 1000; fill();
    raf = requestAnimationFrame(frame);
  }
  function sync() { if (!reduce && !raf && vis && !document.hidden && !hover) { prev = 0; raf = requestAnimationFrame(frame); } }
  function start() {
    if (reduce) {                               // one static line, no motion
      for (var i = 0; i < 3; i++) track.appendChild(node(next()));
      return;
    }
    x = dir < 0 ? view.clientWidth * 0.3 : view.clientWidth * 0.7;
    fill(); sync();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start); else start();
  chy.addEventListener('mouseenter', function () { hover = true; });
  chy.addEventListener('mouseleave', function () { hover = false; sync(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; sync(); }).observe(chy);
  window.__chyron = { next: next, track: track };
})();
