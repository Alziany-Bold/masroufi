#!/bin/sh
# Builds the app and publishes it to https://alziany-bold.github.io/masroufi/ (the phone app updates itself).
set -e
cd "$(dirname "$0")/.."
node scripts/build.js
T=$(mktemp -d)
cp -r dist/. "$T"/
cd "$T" && git init -q -b gh-pages && git add -A && git commit -qm "Publish app" && git push -q -f https://github.com/Alziany-Bold/masroufi.git gh-pages
rm -rf "$T"
echo "Published: https://alziany-bold.github.io/masroufi/"
