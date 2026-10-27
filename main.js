// Minimal progressive enhancement. The site works fully without JS.
var y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();
