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
