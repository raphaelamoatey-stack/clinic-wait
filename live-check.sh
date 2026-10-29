#!/usr/bin/env bash
# Live checks for T8, T9 (PIN gate) and T10 against the deployed Apps Script web app.
# Usage: ./live-check.sh 'https://script.google.com/macros/s/.../exec' 'PIN'
set -u
URL=$1; PIN=${2:-}; fail=0
ok()  { echo "PASS $1"; }
bad() { echo "FAIL $1"; fail=1; }

json=$(curl -sL "$URL")
keys=$(node -e 'const o=JSON.parse(process.argv[1]);console.log(Object.keys(o).sort().join(","))' "$json" 2>/dev/null)
[[ $keys == "closed,updatedAt,waitMinutes" || $keys == "" ]] && ok "T10 GET keys: {$keys}" || bad "T10 GET keys: $keys"

post() { curl -sL -X POST --data-urlencode "$@" "$URL"; }   # -L: Apps Script answers POST with a redirect
sms=$(post "Body=WAIT"); echo "  $sms"
[[ $sms == *"<Message>"* ]] && ok "T8 WAIT -> <Message>" || bad "T8 WAIT -> <Message>"
len=$(echo "$sms" | sed -E 's/.*<Message>(.*)<\/Message>.*/\1/' | tr -d '\n' | wc -m)
(( len <= 160 )) && ok "T8 length $len <= 160" || bad "T8 length $len"
es=$(post "Body=espera"); echo "  $es"
[[ $es == *Unos* || $es == *espera* || $es == *clínica* ]] && ok "T8 ESPERA -> Spanish" || bad "T8 ESPERA -> Spanish"
call=$(curl -sL -X POST -d "CallSid=CAtest" "$URL"); echo "  $call"
[[ $call == *"<Say>"* ]] && ok "T8 call -> <Say>" || bad "T8 call -> <Say>"

[[ $(curl -sL "$URL?staff=1&pin=wrong") == *"Not authorized"* ]] && ok "T9 wrong PIN blocked" || bad "T9 wrong PIN blocked"
if [[ -n $PIN ]]; then
  [[ $(curl -sL "$URL?staff=1&pin=$PIN") == *"Set current wait"* ]] && ok "T9 correct PIN serves staff page" || bad "T9 correct PIN"
fi
exit $fail
