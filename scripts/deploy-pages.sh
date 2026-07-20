#!/usr/bin/env bash
# Rebuild the site and publish it to https://quinto55.github.io/
# (the dist/ folder is its own git repo pointing at quinto55/quinto55.github.io;
# vite preserves dist/.git when emptying the outDir)
set -euo pipefail
cd "$(dirname "$0")/.."
npx vite build
cd dist
git add -A
git commit -m "deploy: EMC-website-redesign@$(git -C .. rev-parse --short HEAD)" || echo "nothing new to deploy"
git push origin main
