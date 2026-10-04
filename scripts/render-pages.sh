#!/usr/bin/env bash
# Render every worksheet page to PNG (200 dpi) and extract textbook text.
# Worksheets map to ws01..ws07 in filename order. Source PDFs are never modified.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p source/page-images source/textbook-text
n=0
while IFS= read -r f; do
  n=$((n+1)); ws=$(printf 'ws%02d' "$n")
  pdftoppm -r 200 -png "$f" "source/page-images/$ws"
done < <(ls source/samples/*.pdf | sort)
for i in 1 2 3 4 5 6 7; do
  f=$(ls source/textbook/dhve10${i}*.pdf)
  pdftotext "$f" "source/textbook-text/ch${i}.txt"
done
