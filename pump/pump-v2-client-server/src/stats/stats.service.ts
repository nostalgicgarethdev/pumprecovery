import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicKey } from '@solana/web3.js';
import { DatabaseService } from 'src/database/database.service';
import { SolPriceService } from 'src/sol-price/sol-price.service';
import { SolProviderService } from 'src/sol-provider/sol-provider.service';

/**
 * Per-coin + platform-wide stats served from the SHARED backend (which holds the
 * Supabase + Birdeye credentials), so every mirror can show them without
 * shipping any secrets. Mirrors the old Next /api/coin-flywheel, /api/orca-tvl,
 * /api/global-stats routes. Results are cached in-memory so the heavy aggregate
 * doesn't recompute (or hammer Birdeye) on every request.
 */

const HOUSE_MINT = 'Ha1JzNcMtzffLaivL7b4Wzoj5um7Nctcy529BbbYpump';
const HOUSE_ORIGINAL_SUPPLY = 1_000_000_000;
const BIRDEYE = 'https://public-api.birdeye.so';
const FEE_BPS = 100; // 1%
const LAMPORTS_PER_SOL = 1e9;
const MAX_COINS = 150;

// Airdrop ("proof of spend") constants — mirror the old Next /api/airdrop route so
// mirrors (no Supabase key) get identical data from the shared backend.
const AIRDROP_FEE_BPS = 100; // 1% fee assumption
const AIRDROP_VENUE_RENT_SOL = 0.115;
const PUMP_ICO_POOL = '9nStgVVCinCyKoBiMGMfCM2iG3TW411EDmUcQqHxL2ek';
const PUMP_PROGRAM = new PublicKey('67LWrtDBPyZqS7SzCYZWBLgPBqZAG94GTfMWEBG2fnuV');
const ORCA_PROGRAM = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const QUOTE_MINTS = new Set([WSOL_MINT, USDC_MINT, HOUSE_MINT]);

function airdropIsoWeek(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function airdropRound(n: number, dp = 6): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly solPriceService: SolPriceService,
    private readonly solProvider: SolProviderService,
    private readonly config: ConfigService,
  ) {}

  private cacheStore = new Map<string, { at: number; data: any }>();
  private async cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const hit = this.cacheStore.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.data;
    const data = await fn();
    this.cacheStore.set(key, { at: Date.now(), data });
    return data;
  }

  private beKey(): string | undefined {
    return this.config.get('birdeyeApiKey');
  }

  private async birdeyeOverview(mint: string): Promise<any> {
    const key = this.beKey();
    if (!key) return null;
    try {
      const r = await fetch(`${BIRDEYE}/defi/token_overview?address=${mint}`, {
        headers: {
          'X-API-KEY': key,
          'x-chain': 'solana',
          accept: 'application/json',
        },
      });
      if (!r.ok) return null;
      return (await r.json())?.data ?? null;
    } catch {
      return null;
    }
  }

  /** Paginated full-table read via the Supabase client (service role). */
  private async allRows(table: string, select: string): Promise<any[]> {
    const rows: any[] = [];
    let offset = 0;
    for (;;) {
      const { data, error } = await this.db.supabase
        .from(table)
        .select(select)
        .range(offset, offset + 999);
      if (error || !data || data.length === 0) break;
      rows.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }
    return rows;
  }

  private async mapLimit<T, R>(
    arr: T[],
    limit: number,
    fn: (x: T) => Promise<R>,
  ): Promise<R[]> {
    const out: R[] = new Array(arr.length);
    let i = 0;
    const workers = Array.from(
      { length: Math.min(limit, arr.length) || 0 },
      async () => {
        while (i < arr.length) {
          const idx = i++;
          out[idx] = await fn(arr[idx]);
        }
      },
    );
    await Promise.all(workers);
    return out;
  }

  /** Sum a coin's trade volume (SOL) from Supabase, handling lamports-vs-SOL. */
  async coinVolumeSol(mint: string): Promise<number> {
    let total = 0;
    let offset = 0;
    let sawLamports = false;
    for (;;) {
      const { data, error } = await this.db.supabase
        .from('trades')
        .select('sol_amount')
        .eq('mint', mint)
        .range(offset, offset + 999);
      if (error || !data || data.length === 0) break;
      for (const t of data) {
        const v = Number((t as any).sol_amount) || 0;
        if (v > 1e6) sawLamports = true;
        total += v;
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    return sawLamports ? total / LAMPORTS_PER_SOL : total;
  }

  async coinFlywheel(mint: string) {
    return this.cached(`cf:${mint}`, 120_000, async () => {
      const volSol = await this.coinVolumeSol(mint).catch(() => 0);
      const solPrice = this.solPriceService.getPrice().solPrice || 0;
      const houseOv = await this.birdeyeOverview(HOUSE_MINT);
      const housePrice = Number(houseOv?.price) || 0;

      const feesSol = volSol * (FEE_BPS / 10000);
      const refIncomeSol = feesSol / 3;
      const burnSol = feesSol / 3;
      const refIncomeUsd = refIncomeSol * solPrice;
      const burnUsd = burnSol * solPrice;
      const burnTokens = housePrice > 0 ? burnUsd / housePrice : 0;

      return {
        volSol,
        refIncomeSol,
        refIncomeUsd,
        burnUsd,
        burnTokens,
        housePrice,
        solPrice,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async orcaTvl(mint: string) {
    return this.cached(`ot:${mint}`, 60_000, async () => {
      const ov = await this.birdeyeOverview(mint);
      if (!ov) {
        return { tvl: 0, vol: 0, source: 'unavailable', updatedAt: new Date().toISOString() };
      }
      return {
        tvl: Number(ov.liquidity) || 0,
        vol: Number(ov.v24hUSD) || 0,
        source: 'birdeye:token_overview',
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async global() {
    return this.cached('global', 300_000, async () => {
      let totalVolumeSol = 0;
      let vol24Sol = 0;
      let coinMints: string[] = [];
      try {
        const [coins, trades] = await Promise.all([
          this.allRows('coins', 'mint,created_timestamp'),
          this.allRows('trades', 'sol_amount,timestamp'),
        ]);
        coinMints = coins
          .sort(
            (a, b) =>
              Number(b.created_timestamp || 0) - Number(a.created_timestamp || 0),
          )
          .map((c) => c.mint)
          .filter(Boolean)
          .slice(0, MAX_COINS);
        const sample = trades.find((t) => Number(t.sol_amount) > 0);
        const looksLamports = !!sample && Number(sample.sol_amount) > 1e6;
        const toSol = (v: any) => Number(v) / (looksLamports ? LAMPORTS_PER_SOL : 1);
        const cutoff = Math.floor(Date.now() / 1000) - 86400;
        for (const t of trades) {
          const sol = toSol(t.sol_amount);
          totalVolumeSol += sol;
          if (Number(t.timestamp) >= cutoff) vol24Sol += sol;
        }
      } catch {
        /* leave 0 */
      }

      const solPrice = this.solPriceService.getPrice().solPrice || 0;
      const houseOv = await this.birdeyeOverview(HOUSE_MINT);
      const housePrice = Number(houseOv?.price) || 0;
      const overviews = await this.mapLimit(coinMints, 2, (m) =>
        this.birdeyeOverview(m),
      );
      const tvlUsd = overviews.reduce(
        (s, o) => s + (Number(o?.liquidity) || 0),
        0,
      );

      let burnedTokens = 0;
      try {
        const sup = await this.solProvider.dedicatedConnection.getTokenSupply(
          new PublicKey(HOUSE_MINT),
        );
        const current = Number(sup.value.uiAmount) || 0;
        burnedTokens = Math.max(0, HOUSE_ORIGINAL_SUPPLY - current);
      } catch {
        /* leave 0 */
      }

      const feesSol = totalVolumeSol * (FEE_BPS / 10000);
      const refIncomeSol = feesSol / 3;

      return {
        tvlUsd,
        volume24hUsd: vol24Sol * solPrice,
        totalVolumeUsd: totalVolumeSol * solPrice,
        totalVolumeSol,
        refIncomeUsd: refIncomeSol * solPrice,
        refIncomeSol,
        burnedTokens,
        burnedUsd: burnedTokens * housePrice,
        housePrice,
        solPrice,
        coins: coinMints.length,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Set of meme mints that have a program-owned ("LP forever") Orca venue — derived
   * LIVE from chain (lp_owner's position NFTs → their whirlpools → the non-quote
   * side). Replaces the old route's dependency on a static lpPositions.json so the
   * backend has no per-mirror file to ship. Cached 5 min.
   */
  private async venueMints(): Promise<Set<string>> {
    return this.cached('airdrop:venueMints', 300_000, async () => {
      const out = new Set<string>();
      try {
        const conn = this.solProvider.dedicatedConnection;
        const lpOwner = PublicKey.findProgramAddressSync(
          [Buffer.from('lp_owner')],
          PUMP_PROGRAM,
        )[0];
        const parsed = await conn.getParsedTokenAccountsByOwner(lpOwner, {
          programId: TOKEN_PROGRAM,
        });
        const positionPdas: PublicKey[] = [];
        for (const { account } of parsed.value) {
          const info: any = account.data?.parsed?.info;
          const amt = info?.tokenAmount;
          if (amt && amt.decimals === 0 && amt.amount === '1') {
            try {
              positionPdas.push(
                PublicKey.findProgramAddressSync(
                  [Buffer.from('position'), new PublicKey(info.mint).toBuffer()],
                  ORCA_PROGRAM,
                )[0],
              );
            } catch {
              /* skip */
            }
          }
        }
        if (positionPdas.length === 0) return out;
        const whirlpoolByPos = new Map<string, PublicKey>();
        const whirlpoolSet = new Set<string>();
        for (let i = 0; i < positionPdas.length; i += 100) {
          const accs = await conn.getMultipleAccountsInfo(
            positionPdas.slice(i, i + 100),
            'confirmed',
          );
          accs.forEach((a) => {
            if (!a || !a.owner.equals(ORCA_PROGRAM)) return;
            const wp = new PublicKey(a.data.subarray(8, 40));
            whirlpoolByPos.set(wp.toBase58(), wp);
            whirlpoolSet.add(wp.toBase58());
          });
        }
        const whirlpools = Array.from(whirlpoolSet).map((s) => new PublicKey(s));
        for (let i = 0; i < whirlpools.length; i += 100) {
          const accs = await conn.getMultipleAccountsInfo(
            whirlpools.slice(i, i + 100),
            'confirmed',
          );
          accs.forEach((a) => {
            if (!a) return;
            const mintA = new PublicKey(a.data.subarray(101, 133)).toBase58();
            const mintB = new PublicKey(a.data.subarray(181, 213)).toBase58();
            // meme = the side that ISN'T a known quote (WSOL/USDC/HOUSE).
            if (QUOTE_MINTS.has(mintA) && !QUOTE_MINTS.has(mintB)) out.add(mintB);
            else if (QUOTE_MINTS.has(mintB) && !QUOTE_MINTS.has(mintA)) out.add(mintA);
          });
        }
      } catch {
        /* on-chain hiccup -> empty set (venue-rent just contributes 0) */
      }
      return out;
    });
  }

  private async pumpIcoPrice(): Promise<any> {
    return this.cached('airdrop:pumpIco', 60_000, async () => {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/pairs/solana/${PUMP_ICO_POOL}`,
        );
        if (!res.ok) return null;
        const j: any = await res.json();
        const p = (j.pairs && j.pairs[0]) || j.pair;
        if (!p) return null;
        return {
          mint: p.baseToken?.address ?? null,
          symbol: p.baseToken?.symbol ?? 'Pump ICO',
          priceUsd: Number(p.priceUsd) || null,
          priceSol: Number(p.priceNative) || null,
          marketCapUsd: p.marketCap ?? p.fdv ?? null,
          liquidityUsd: p.liquidity?.usd ?? null,
          pool: PUMP_ICO_POOL,
          fetchedAt: new Date().toISOString(),
        };
      } catch {
        return null;
      }
    });
  }

  /**
   * Airdrop "proof of spend" leaderboard — the SAME aggregation the old Next
   * /api/airdrop route did, served from the shared backend so mirrors without a
   * Supabase key still render the airdrop page. Cached 2 min (full trades scan).
   */
  async airdrop() {
    return this.cached('airdrop', 120_000, async () => {
      const venueMints = await this.venueMints();

      const [coins, trades] = await Promise.all([
        this.allRows('coins', 'mint,creator'),
        this.allRows('trades', 'user,sol_amount,is_buy,timestamp,mint'),
      ]);
      let users2: any[] = [];
      try {
        users2 = await this.allRows('users2', 'address,username,profile_image');
      } catch {
        users2 = [];
      }
      const profile = new Map(users2.map((u: any) => [u.address, u]));

      const sample = trades.find((t: any) => Number(t.sol_amount) > 0);
      const looksLamports = !!sample && Number(sample.sol_amount) > 1e6;
      const toSol = (v: any) => Number(v) / (looksLamports ? LAMPORTS_PER_SOL : 1);

      const creatorCoins = new Map<string, { coinsCreated: number; venueMints: string[] }>();
      for (const c of coins as any[]) {
        if (!c.creator) continue;
        const rec = creatorCoins.get(c.creator) ?? { coinsCreated: 0, venueMints: [] };
        rec.coinsCreated += 1;
        if (venueMints.has(c.mint)) rec.venueMints.push(c.mint);
        creatorCoins.set(c.creator, rec);
      }

      type Agg = {
        wallet: string;
        buySol: number;
        sellSol: number;
        trades: number;
        buys: number;
        sells: number;
        mints: Set<string>;
        weeks: Set<string>;
      };
      const wallets = new Map<string, Agg>();
      const get = (w: string): Agg => {
        let a = wallets.get(w);
        if (!a) {
          a = { wallet: w, buySol: 0, sellSol: 0, trades: 0, buys: 0, sells: 0, mints: new Set(), weeks: new Set() };
          wallets.set(w, a);
        }
        return a;
      };

      for (const t of trades as any[]) {
        if (!t.user) continue;
        const w = get(t.user);
        const sol = toSol(t.sol_amount);
        if (t.is_buy) {
          w.buySol += sol;
          w.buys += 1;
        } else {
          w.sellSol += sol;
          w.sells += 1;
        }
        w.trades += 1;
        if (t.mint) w.mints.add(t.mint);
        const ts = Number(t.timestamp);
        if (ts) w.weeks.add(airdropIsoWeek(ts));
      }
      creatorCoins.forEach((_rec, creator) => get(creator));

      const out = Array.from(wallets.values()).map((w) => {
        const grossSol = w.buySol + w.sellSol;
        const netSol = w.buySol - w.sellSol;
        const feesPaidSol = (grossSol * AIRDROP_FEE_BPS) / 10000;
        const cc = creatorCoins.get(w.wallet);
        const coinsWithVenues = cc ? cc.venueMints.length : 0;
        const venueRentSol = coinsWithVenues * AIRDROP_VENUE_RENT_SOL;
        const p: any = profile.get(w.wallet);
        return {
          wallet: w.wallet,
          username: p?.username ?? null,
          buySol: airdropRound(w.buySol),
          sellSol: airdropRound(w.sellSol),
          grossSol: airdropRound(grossSol),
          netSol: airdropRound(netSol),
          feesPaidSol: airdropRound(feesPaidSol),
          trades: w.trades,
          buys: w.buys,
          sells: w.sells,
          distinctMints: w.mints.size,
          activeWeeks: w.weeks.size,
          washResistance: grossSol > 0 ? airdropRound(Math.abs(netSol) / grossSol, 4) : 0,
          coinsCreated: cc?.coinsCreated ?? 0,
          coinsWithVenues,
          venueRentSol: airdropRound(venueRentSol),
        };
      });
      out.sort((a, b) => b.feesPaidSol + b.venueRentSol - (a.feesPaidSol + a.venueRentSol));

      const pumpIco = await this.pumpIcoPrice();

      return {
        generatedAt: new Date().toISOString(),
        pumpIco,
        assumptions: {
          FEE_BPS: AIRDROP_FEE_BPS,
          VENUE_RENT_SOL: AIRDROP_VENUE_RENT_SOL,
          solUnit: looksLamports ? 'lamports' : 'sol',
        },
        totals: {
          wallets: out.length,
          coins: coins.length,
          trades: trades.length,
          coinsWithVenues: venueMints.size,
          grossVolumeSol: airdropRound(out.reduce((s, x) => s + x.grossSol, 0)),
        },
        wallets: out,
      };
    });
  }
}
