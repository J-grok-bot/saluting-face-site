# saluting-face.com

Static site for Saluting Face LLC. Plain HTML/CSS + a 3-line JS file, no build step.

- `index.html` – single page (hero, what we do, how it works, about, contact)
- `styles.css` – brand tokens: #0E0E10 bg, #FFC233 yellow, #F6F3EC off-white; JetBrains Mono (Google Fonts)
- `favicon.svg`, `apple-touch-icon.png`, `og.png` – icons and social preview
- `CNAME` – `saluting-face.com` for GitHub Pages; `.nojekyll` disables Jekyll

Preview locally: `python3 -m http.server 8000` then open http://localhost:8000

TODO before launch: confirm the contact email (placeholder `info@saluting-face.com`).
