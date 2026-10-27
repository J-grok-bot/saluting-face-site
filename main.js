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
  var W = 34; // wind-up frames reach col 33; row 0 in the HTML is padded to 34 so width is reserved
  var TEXT = ["salut", "ing-face-s", "aluting-face-", "saluting-face-s", "aluting-f", "ace-salu", "ting-face", "-salu   ti", "ng-f     ace-sa", "luti     ng-face-salu", "ting    -face-salutin", "g-face -saluting-face", "-saluting-face-salut", "ing-face-saluting-fa", "ce-saluting-face-sa", "          luting-f", "ace-saluting-face", "-saluting-face-", "saluting-face", "-saluting-", "face-s"];
  var ARMS = {"lift":[null,null,null,[22,29],[15,31],[10,27],[10,22],[13,17],null,null,null,null,null,null,null,null,null,null,null,null,null],"reach":[null,[25,31],[20,32],[17,30],[13,25],[10,19],[11,14],null,null,null,null,null,null,null,null,null,null,null,null,null,null],"flick":[[24,33],[18,33],[16,28],[16,23],[11,18],[10,13],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],"rest":[null,null,null,null,[11,13],[10,21],[10,28],[13,29],[22,29],null,null,null,null,null,null,null,null,null,null,null,null]};
  if (rows.length !== TEXT.length) return;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function pad(n) { return n > 0 ? new Array(n + 1).join(' ') : ''; }
  function draw(name) {
    var arm = ARMS[name];
    for (var i = 0; i < rows.length; i++) {
      var t = TEXT[i], a = arm[i], html = t, len = t.length;
      if (a) {
        html += pad(a[0] - len) + '<b class="eq">' + pad(a[1] - a[0] + 1).replace(/ /g, '=') + '</b>';
        len = a[1] + 1;
      }
      rows[i].innerHTML = html + pad(W - len);
    }
  }

  // [frame, hold ms] : wind-up — the arm lifts off the brow and swings up/out to the upper right,
  // flicks, then snaps back down onto the brow with a yellow flash (~575ms)
  var SEQ = [['lift', 70], ['reach', 90], ['flick', 140], ['reach', 45], ['rest', 230, 'flash'], ['rest', 0]];
  var playing = false;

  function salute() {
    if (playing || reduce.matches) return;
    playing = true;
    art.classList.add('is-saluting');
    var k = 0;
    (function step() {
      var f = SEQ[k];
      draw(f[0]);
      art.classList.toggle('is-flash', f[2] === 'flash');
      if (++k < SEQ.length) { setTimeout(step, f[1]); }
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

// Text rain: "saluting-face" (with the odd o7 / _o)7) falling in a small masked bubble behind the face.
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
          ctx.fillStyle = 'rgba(255,194,51,0.2)';
          ctx.fillText(glyph(col, col.lastRow), col.x, col.lastRow * fs);
        }
        ctx.fillStyle = 'rgba(255,214,110,0.62)';   // brighter yellow lead
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
    ctx.fillStyle = 'rgba(255,194,51,0.10)';
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
