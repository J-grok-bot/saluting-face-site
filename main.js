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
  var W = 30;
  var TEXT = ["salut", "ing-face-s", "aluting-face-", "saluting-face-s", "aluting-f", "ace-salu", "ting-face", "-salu   ti", "ng-f     ace-sa", "luti     ng-face-salu", "ting    -face-salutin", "g-face -saluting-face", "-saluting-face-salut", "ing-face-saluting-fa", "ce-saluting-face-sa", "          luting-f", "ace-saluting-face", "-saluting-face-", "saluting-face", "-saluting-", "face-s"];
  var ARMS = {"drop1":[null,null,null,null,null,null,[12,14],[11,22],[16,29],[22,29],[23,29],null,null,null,null,null,null,null,null,null,null],"drop2":[null,null,null,null,null,null,null,null,null,null,[22,22],[22,29],[21,29],[23,29],null,null,null,null,null,null,null],"up":[null,null,null,null,null,null,[12,14],[11,22],[16,29],[22,29],[23,29],null,null,null,null,null,null,null,null,null,null],"rest":[null,null,null,null,[11,13],[10,21],[10,28],[13,29],[22,29],null,null,null,null,null,null,null,null,null,null,null,null]};
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

  // [frame, hold ms] : arm drops, hangs, snaps back to the brow with a yellow flash
  var SEQ = [['drop1', 70], ['drop2', 150], ['up', 60], ['rest', 280, 'flash'], ['rest', 0]];
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
  var targets = [copy.querySelector('.wordmark'), copy.querySelector('.pitch'), copy.querySelector('.prompt')]
    .concat([].slice.call(copy.querySelectorAll('.hero__actions .btn')));
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
    if (t.classList.contains('btn')) t.classList.add('pend');
    queue.push({ el: t, chars: chars });
  });
  copy.classList.add('typing');
  root.classList.remove('boot');
  api.running = true;

  // Build an irregular per-char schedule, then scale it to ~2.4s total.
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
  var scale = 2400 / t, START = 550, t0 = null, idx = 0, at = null, raf = null, timer = null;
  function mark(s) { if (at) at.classList.remove('at'); at = s; if (s) s.classList.add('at'); }
  function done() {
    clearTimeout(timer); if (raf) cancelAnimationFrame(raf); mark(null);
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
    if (idx >= steps.length) { timer = setTimeout(done, 140); return; }
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
  var MAX = 280, buf = '', started = false;
  function render() { out.textContent = buf ? ' ' + buf : ''; }
  function add(str) {
    str = str.replace(/[\r\n\t]/g, ' ');
    if (!str) return;
    started = true;
    buf = (buf + str).slice(0, MAX);
    render();
  }
  function back() { if (buf) { buf = buf.slice(0, -1); render(); } }
  function clear() { buf = ''; render(); }
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
    if (k === 'Backspace') { if (started) { e.preventDefault(); back(); } return; }
    if (k === 'Enter' || k === 'Escape') { if (started && !isControl(el)) { e.preventDefault(); clear(); } return; }
    if (k.length !== 1) return;              // arrows, Tab, F-keys, etc.
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
      if (t.indexOf('delete') === 0) back();
      else if (t === 'insertLineBreak' || t === 'insertParagraph') clear();
      else if (e.data) add(e.data);
    });
    sink.addEventListener('input', function () { if (sink.value) { add(sink.value); sink.value = ''; } });
    sink.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); clear(); }
    });
  }
})();
