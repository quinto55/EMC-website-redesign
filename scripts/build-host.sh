#!/usr/bin/env bash
# Build the upload package for the current web host.
#   bash scripts/build-host.sh [--check-only] [host-listing.txt]
# Builds into dist-host/ and dist-host.zip (never into dist/, the staging folder).
# With a plain text file listing the host's web-root entries (one per line, from ls -A), it first
# checks the listing (scripts/check-listing.mjs) and stops if any package entry already exists there.
# --check-only checks the listing and stops before building.
set -euo pipefail
# A relative listing path is resolved from where the person ran the script, before we move.
CHECK_ONLY=0
if [ "${1:-}" = "--check-only" ]; then CHECK_ONLY=1; shift; fi
LISTING="${1:-}"
if [ -n "$LISTING" ]; then
  if [ ! -f "$LISTING" ]; then
    echo "Listing file not found: $LISTING" >&2
    exit 2
  fi
  LISTING="$(cd "$(dirname "$LISTING")" && pwd)/$(basename "$LISTING")"
fi
cd "$(dirname "${BASH_SOURCE[0]}")/.."

EXPECTED="about contact emc-site fair-services index.html iafe marketing platform privacy retail-partners robots.txt sitemap.xml terms"

# Check the listing first, so a bad one stops before anything is built. A check that builds nothing
# deletes nothing; before a build, a failed check also removes the old zip so it cannot be uploaded by mistake.
if [ -n "$LISTING" ]; then
  if ! node scripts/check-listing.mjs "$LISTING" $EXPECTED; then
    echo "BUILD STOPPED: the listing check failed; do not upload" >&2
    if [ "$CHECK_ONLY" -eq 0 ]; then rm -f dist-host.zip; fi
    exit 1
  fi
fi
if [ "$CHECK_ONLY" -eq 1 ]; then exit 0; fi

trap 'rc=$?; if [ "$rc" -ne 0 ]; then rm -f dist-host.zip; fi' EXIT
fail() { echo "BUILD FAILED: $1" >&2; rm -f dist-host.zip; exit 1; }

rm -f dist-host.zip
npx vite build --outDir dist-host --emptyOutDir || fail "vite build did not finish"

# The package is for the web root only: no staging leftovers. The not-found page moves under emc-site/, where the
# Cloudflare worker serves it in place of the old host's own (deploy/cloudflare/worker.js).
rm -f dist-host/.nojekyll
mv dist-host/404.html dist-host/emc-site/404.html

ACTUAL="$(cd dist-host && ls -A | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"
WANT="$(echo "$EXPECTED" | tr ' ' '\n' | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//')"
if [ "$ACTUAL" != "$WANT" ]; then
  echo "Expected top level: $WANT" >&2
  echo "Found top level:    $ACTUAL" >&2
  fail "the top-level entries are not exactly the thirteen expected"
fi
[ -f dist-host/emc-site/.htaccess ] || fail "dist-host/emc-site/.htaccess is missing"

# Every file under emc-site/, sorted, so a later deploy can be compared with this one.
(cd dist-host/emc-site && find . -type f ! -name MANIFEST.txt | sed 's|^\./||' | LC_ALL=C sort) > dist-host/emc-site/MANIFEST.txt \
  || fail "could not write the manifest"

# The zip holds the web-root contents directly (no dist-host/ folder around them).
(cd dist-host && python3 -m zipfile -c ../dist-host.zip $EXPECTED) || fail "could not make the zip"
python3 -m zipfile -t dist-host.zip >/dev/null || fail "the zip did not pass its own test"

FILES="$(find dist-host -type f | wc -l | tr -d ' ')"
SIZE="$(du -sh dist-host | cut -f1)"
ZIPSIZE="$(du -h dist-host.zip | cut -f1)"
echo
echo "Package ready: dist-host/ ($FILES files, $SIZE) and dist-host.zip ($ZIPSIZE)"
echo "Top level: $ACTUAL"
