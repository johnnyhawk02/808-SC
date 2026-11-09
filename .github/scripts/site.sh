#!/bin/sh
# Collects the site into site/: 808 Circuit (elixir/) at the root, the voice bench under bench/ (the app reads
# cache1/, one hit a voice). Used by the GitHub Pages and the Cloudflare Pages deploys.
set -e
rm -rf site
mkdir -p site/bench
cp -r elixir/index.html elixir/help.html elixir/manifest.webmanifest elixir/sw.js elixir/icons elixir/irs cache1 site/
cp -r index.html app.js worklet.js cache-worker.js dsp voices cache site/bench/
# the old elixir/ address sends people to the root
mkdir site/elixir && printf '<!doctype html><meta charset="utf-8"><title>808 Circuit</title><meta http-equiv="refresh" content="0; url=../"><a href="../">808 Circuit has moved</a>\n' > site/elixir/index.html
