#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PROGRAM_ID="67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV"
RPC="http://127.0.0.1:8899"

echo "Starting surfpool harness..."
pkill -x surfpool 2>/dev/null || true
rm -rf .surfpool/logs
surfpool start --ci --no-tui --no-studio --legacy-anchor-compatibility --yes --no-deploy --db :memory: --surfnet-id harness --log-path .surfpool/logs --log-level info > /tmp/surfpool-harness.log 2>&1 &
SPID=$!
echo "surfpool pid $SPID"
for i in $(seq 1 20); do
  if curl -s --max-time 1 "$RPC" -X POST -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null | grep -q '"ok"'; then
    echo "surfpool READY"
    break
  fi
  sleep 1
done

echo "Loading program via surfnet_writeProgram..."
node -e '
const fs=require("fs");
const so=fs.readFileSync("target/deploy/pump.so");
const pid="'"$PROGRAM_ID"'";
const hex=so.toString("hex");
fetch("'"$RPC"'",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"surfnet_writeProgram",params:[pid,hex,0]})}).then(r=>r.json()).then(console.log).catch(console.error);
'

echo "Resetting program-owned PDAs (surfpool forks mainnet where they already exist)..."
GLOBAL_PDA=$(node -e 'const {PublicKey}=require("@solana/web3.js");const [g]=PublicKey.findProgramAddressSync([Buffer.from("global")],new PublicKey(process.argv[1]));console.log(g.toBase58());' "$PROGRAM_ID")
curl -s --max-time 5 "$RPC" -X POST -H 'content-type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"surfnet_setAccount\",\"params\":[\"$GLOBAL_PDA\",{\"lamports\":0,\"data\":\"\",\"owner\":\"11111111111111111111111111111111\",\"executable\":false,\"rentEpoch\":0}]}" >/dev/null || true
echo "Reset global PDA $GLOBAL_PDA"

echo "Airdrop..."
solana airdrop 10 --url "$RPC" ~/.config/solana/id.json || true

echo "Running tests on surfpool harness..."
set +e
ANCHOR_PROVIDER_URL="$RPC" ANCHOR_WALLET=~/.config/solana/id.json \
  ./node_modules/.bin/ts-mocha -p ./tsconfig.json -t 1000000 tests/pump.ts
TEST_EXIT=$?
set -e
echo "TESTS EXIT CODE: $TEST_EXIT"

echo "Stopping surfpool (pid $SPID)..."
kill "$SPID" 2>/dev/null || true
exit $TEST_EXIT
