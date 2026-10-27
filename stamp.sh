#!/bin/sh
# Cache-busting: stamp styles.css / main.js references in index.html with a content hash.
# Run before every commit that touches either file.
cd "$(dirname "$0")"
for f in styles.css main.js; do
  h=$(sha1sum "$f" | cut -c1-8)
  sed -i -E "s#(href|src)=\"$f(\?v=[0-9a-f]+)?\"#\1=\"$f?v=$h\"#" index.html
done
grep -nE 'styles.css|main.js' index.html
