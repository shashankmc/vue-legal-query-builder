#!/usr/bin/env sh
# Writes LDH_KEY into .env.local without the key appearing on screen, in shell
# history, or in a process list.
#
#   sh scripts/set-ldh-key.sh            # prompts; paste the key, press Enter
#   some-command | sh scripts/set-ldh-key.sh   # or pipe it in (e.g. a password manager CLI)
set -eu

cd "$(dirname "$0")/.."
file=.env.local

if [ -t 0 ]; then
  printf 'Paste your Legal Data Hunter API key (input hidden): '
  stty -echo
  trap 'stty echo' EXIT INT TERM
  IFS= read -r key
  stty echo
  printf '\n'
else
  IFS= read -r key
fi

key=$(printf '%s' "$key" | tr -d '[:space:]')
case "$key" in
  sk-*) ;;
  *) echo "That doesn't look like an LDH key (they start with sk-). Nothing written." >&2; exit 1 ;;
esac

umask 077
touch "$file"
tmp=$(mktemp "$file.XXXXXX")
grep -v '^LDH_KEY=' "$file" > "$tmp" || true
printf 'LDH_KEY=%s\n' "$key" >> "$tmp"
mv "$tmp" "$file"
chmod 600 "$file"

echo "Saved to $file (${#key} chars, starts ${key%"${key#?????}"}…). Restart npm run demo to pick it up."
