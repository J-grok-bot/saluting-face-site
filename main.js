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
  var SCRIPT = ["[agent-01] online. keys loaded. o7",
    "[agent-12] on station. watching egress.",
    "[agent-09] SYN. tunnel up. handshake verified.",
    "[agent-07] heartbeat ok. mTLS green.",
    "[agent-05] online. certs pinned. o7",
    "[agent-11] ACK. SIEM feed attached.",
    "[agent-02] auth logs clean. ready.",
    "[agent-03] online. baseline loaded, 0 drift.",
    "[agent-14] on post. edges 1-4 visible. o7",
    "[agent-07] -> [agent-09] heartbeat seq=1 ack?",
    "[agent-09] -> [agent-07] ACK seq=1. latency 4ms.",
    "[agent-08] honeypots armed. 6/6 responsive.",
    "[agent-19] canary tokens untouched.",
    "[agent-21] online. resync complete. what did i miss?",
    "[agent-12] -> [agent-21] nothing. queue=0.",
    "[agent-06] reporting. playbooks loaded. o7",
    "[agent-10] online. 3 patches staged, unsigned=0.",
    "[agent-04] air-gap holding.",
    "[ops] roll call complete. 15/15 agents healthy.",
    "[ops] inbound request via info@saluting-face.com.",
    "[ops] client requires saluting-face crew. scope: [REDACTED].",
    "[agent-01] -> [ops] contract verified. sig valid.",
    "[ops] saluting-face is go. op ███ is live.",
    "[ops] policy zt-v2 enforced.",
    "[agent-05] ACK.",
    "[agent-14] ACK. o7",
    "[ops] -> [agent-09] lead on payload. task#4410",
    "[agent-09] ACK task#4410. taking lead.",
    "[agent-01] payload signed. sig=ed25519 ok.",
    "[agent-09] -> [agent-11] payload staged. await go.",
    "[agent-11] -> [agent-09] signature valid. conf=0.99. go on mark.",
    "[agent-07] perimeter sweep clean. segments 1-6.",
    "[agent-02] -> [agent-07] confirm segment 5?",
    "[agent-07] -> [agent-02] seg 5 clean. 0 open findings.",
    "[agent-11] mark.",
    "[agent-09] payload in transit. hop 1/3.",
    "[agent-12] -> [agent-02] need scope on the brief.",
    "[agent-02] -> [agent-12] scope=[REDACTED]. need-to-know.",
    "[agent-12] ACK.",
    "[agent-21] -> [ops] status on op ███?",
    "[ops] -> [agent-21] classified. continue task#4402.",
    "[agent-21] ACK. continuing.",
    "[agent-01] keys rotated. old set retired. task#4411",
    "[agent-19] -> [agent-01] new fingerprints logged.",
    "[agent-08] SIEM quiet. 0 alerts in last 900s.",
    "[agent-10] patch window open. task#4412",
    "[agent-04] -> [agent-10] rollback snapshot ready.",
    "[agent-10] -> [agent-04] ACK. applying 1/3.",
    "[agent-14] port scan on edge 3. inbound, logged.",
    "[agent-03] -> [agent-14] src? rate?",
    "[agent-14] -> [agent-03] single src. 212 pps. tracing.",
    "[agent-08] honeypot tripped. seg=2 conf=0.91.",
    "[agent-17] spun up. IOC matched. same src as edge 3.",
    "[ops] all units hold. no changes until contained.",
    "[agent-10] holding at 2/3.",
    "[agent-17] host=███ risk=med action=isolate?",
    "[ops] vote: isolate.",
    "[agent-03] vote: isolate. conf=0.95",
    "[agent-05] vote: isolate. conf=0.97",
    "[ops] consensus: isolate (3/3). handoff to agent-06.",
    "[agent-06] ACK. quarantining host.",
    "[agent-06] host isolated. egress blocked. task#4419",
    "[agent-02] auth review: 0 valid sessions from src.",
    "[agent-11] integrity check passed. 41/41 nodes.",
    "[ops] contained. no breach. carry on.",
    "[agent-11] incident report queued for saluting-face ops.",
    "[agent-21] heart rate nominal. i don't have one.",
    "[agent-10] resuming. 3/3 applied. hashes verified.",
    "[agent-10] patch window closed.",
    "[agent-19] -> [agent-11] who approved [REDACTED]?",
    "[agent-11] -> [agent-19] above both our permission scopes.",
    "[agent-19] ACK.",
    "[agent-04] anomaly on node-7 resolved. cause=clock drift.",
    "[agent-09] payload at hop 2/3.",
    "[agent-11] -> [agent-09] conditions?",
    "[agent-09] channel clean. jitter 1ms.",
    "[agent-12] -> [agent-10] handoff watch task#4420",
    "[agent-10] ACK task#4420. i have the watch.",
    "[ops] all stations: phase two authorized.",
    "[agent-09] ACK. final hop.",
    "[agent-11] ACK.",
    "[agent-02] ACK. o7",
    "[agent-07] perimeter holding.",
    "[agent-21] -> [agent-09] window closes in 120s.",
    "[agent-09] -> [agent-21] eta 14s.",
    "[agent-03] checksums match end to end.",
    "[ops] payload is go. repeat, payload is go.",
    "[agent-09] payload delivered. integrity verified.",
    "[agent-09] -> [ops] objective secured. ███ ███ ███.",
    "[ops] confirmed. revoking all op sessions.",
    "[agent-01] sessions revoked. keys burned. o7",
    "[agent-19] canaries reset. 0 touched.",
    "[agent-14] -> [agent-01] same window tomorrow? o7",
    "[agent-01] -> [agent-14] scheduled. task#4500",
    "[agent-12] tunnel down. heartbeat off. o7",
    "[agent-17] trace archived. NACK on further work.",
    "[agent-21] -> [agent-17] noted. o7",
    "[agent-08] honeypots stay armed. signing off.",
    "[agent-02] o7",
    "[agent-11] o7",
    "[ops] client notified. job closed under saluting-face.",
    "[ops] crew standing by for next request. info@saluting-face.com",
    "[ops] op ███ complete. all units stand down. o7"];
  var rnd = function (n) { return Math.floor(Math.random() * n); };
  // timestamps are the visitor's real local clock (HH:MM:SS, 24h) at the moment a line appears
  function stamp(back) {
    var d = new Date(Date.now() - (back || 0) * 1000), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  // "[agent-03] -> [agent-11] pkg staged." -> [[class, text], ...]
  function tokens(line) {
    var out = [], m = /^\[([a-z]+-\d+|ops)\]\s*/.exec(line);
    if (m) { out.push([m[1] === 'ops' ? 'who ops' : 'who', m[1]]); out.push(['', ' ']); line = line.slice(m[0].length); }
    var d = /^->\s*\[([a-z]+-\d+|ops)\]\s*/.exec(line);
    if (d) { out.push(['arw', '-> ']); out.push(['to', d[1]]); out.push(['', ' ']); line = line.slice(d[0].length); }
    var o7 = /(^| )o7$/.test(line); if (o7) line = line.replace(/ ?o7$/, '');
    line.split(/(\[REDACTED\]|█+(?: █+)*)/).forEach(function (part, i) {
      if (i % 2) { out.push(['red', part]); return; }
      part.split(/(info@saluting-face\.com|saluting-face)/).forEach(function (q, k) { if (q) out.push([k % 2 ? (q.indexOf('@') > 0 ? 'mail' : 'brand') : '', q]); });
    });
    if (o7) { if (line) out.push(['', ' ']); out.push(['o7', 'o7']); }
    return out;
  }
  // blinking cursor: rides at the end of the newest (bottom) line; alone on an empty prompt row until the first line
  var cur = document.createElement('span'); cur.className = 'cur';
  var prompt = document.createElement('div');
  prompt.className = 'crewlog__line crewlog__prompt';
  prompt.innerHTML = '<span class="ts"></span><span class="msg"></span>';
  prompt.lastChild.appendChild(cur);
  box.appendChild(prompt);
  var MAXROWS = 18;
  function row(ts, build) {
    var r = document.createElement('div'), t = document.createElement('span'), msg = document.createElement('span');
    r.className = 'crewlog__line'; t.className = 'ts'; msg.className = 'msg';
    t.textContent = ts; build(msg); msg.appendChild(document.createTextNode(' ')); msg.appendChild(cur);
    r.appendChild(t); r.appendChild(msg);
    if (prompt.parentNode) box.removeChild(prompt);
    box.appendChild(r);
    while (box.children.length > MAXROWS) box.removeChild(box.firstChild);   // bounded DOM
    return r;
  }
  function message(line, back) {
    return row(stamp(back), function (msg) {
      tokens(line).forEach(function (t) {
        var s = document.createElement('span'); if (t[0]) s.className = t[0];
        if (t[0] === 'brand') s.innerHTML = 'saluting<span class="hy">-</span>face'; else s.textContent = t[1];
        msg.appendChild(s);
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
      var wait = n < 16 ? 1300 + rnd(600) : 1500 + n * 22 + rnd(700);  // ~2-3s; quick acks faster, long lines slower
      timer = setTimeout(show, idx < SCRIPT.length ? wait : 1600);
    } else {
      glide(closed()); done = true; log.classList.add('done');
    }
  }
  function sync() { if (!done && !mq.matches && !timer && vis && !document.hidden) timer = setTimeout(show, 700); }
  if (mq.matches) {                                             // reduced motion: the ending, static
    var last = SCRIPT.slice(-7), back = 2;                    // stamp backwards from now, a few seconds apart
    for (var i = last.length - 1; i >= 0; i--) { last[i] = [last[i], back]; back += 2 + rnd(4); }
    last.forEach(function (l) { message(l[0], l[1]); }); closed(); done = true;
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
