const fs = require('fs');
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC = 'http://127.0.0.1:8899';
const conn = new Connection(RPC, 'confirmed');

const PROGRAM_ID = new PublicKey('67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV');
const PROGRAMDATA_ID = new PublicKey('AAWauTuvo2iAhyEoK7yfH22zTLdcuNaCBawbjxWBrHXY');
const LOADER_ID = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
const AUTH_PUBKEY = new PublicKey('DUMYAptPb86KXGchNphciwBwDTiQ88CMK6hYy9m6UoER');

async function main() {
  const soData = fs.readFileSync('target/deploy/pump.so');
  console.log('SO size:', soData.length);

  // programdata data: <u32 3> <u64 slot0> <u8 1> <pubkey32 auth> <so bytes>
  const pdata = Buffer.alloc(4 + 8 + 1 + 32 + soData.length);
  pdata.writeUInt32LE(3, 0);
  pdata.writeBigUInt64LE(0n, 4);
  pdata.writeUInt8(1, 12);
  pdata.set(AUTH_PUBKEY.toBytes(), 13);
  pdata.set(soData, 45);
  console.log('pdata built len:', pdata.length);

  // program acc data: <u32 2> <programdata pubkey 32>
  const progAccData = Buffer.alloc(4 + 32);
  progAccData.writeUInt32LE(2, 0);
  progAccData.set(PROGRAMDATA_ID.toBytes(), 4);

  const LAMPORTS_PDATA = 3_109_929_840;
  const LAMPORTS_PROG = 1_141_440;

  // Use raw RPC call for surfnet_setAccount
  async function setAccount(addr, lamports, dataBuf, executable) {
    const dataB64 = dataBuf.toString('base64');
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'surfnet_setAccount',
      params: [
        addr.toBase58(),
        {
          lamports,
          owner: LOADER_ID.toBase58(),
          executable,
          data: [dataB64, 'base64'],
        },
      ],
    };
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    console.log('set', addr.toBase58().slice(0,8), 'err?', j.error || 'ok', 'result?', !!j.result);
    return j;
  }

  await setAccount(PROGRAMDATA_ID, LAMPORTS_PDATA, pdata, true);
  await setAccount(PROGRAM_ID, LAMPORTS_PROG, progAccData, true);

  // verify
  const info = await conn.getAccountInfo(PROGRAM_ID);
  console.log('after program acc executable:', info?.executable);
  const pdataInfo = await conn.getAccountInfo(PROGRAMDATA_ID);
  console.log('after pdata executable:', pdataInfo?.executable);
  console.log('ready?');
}

main().catch(e => { console.error(e); process.exit(1); });
