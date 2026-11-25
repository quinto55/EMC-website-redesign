#!/usr/bin/env bash
# Build the new site for Cloudflare into dist-cf/ (deploy/GO-LIVE-CLOUDFLARE.md).
# It is the Apache package (scripts/build-host.sh, with all its checks) minus the Apache settings file, plus Cloudflare's.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
bash scripts/build-host.sh
rm -rf dist-cf
cp -r dist-host dist-cf
rm dist-cf/emc-site/.htaccess
cp deploy/cloudflare/_headers dist-cf/_headers
echo "Cloudflare build ready: dist-cf/ ($(find dist-cf -type f | wc -l | tr -d ' ') files)"
