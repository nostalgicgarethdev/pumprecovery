import { statusAll, REGISTRY_BRAND } from "@/lib/mirrors";
import { getSolPrice, earningsByReferrer } from "@/lib/earnings";
import { MIRROR_WARNING } from "@/lib/warning";

// Always reflect live mirror status + earnings.
export const dynamic = "force-dynamic";

const host = (o: string) => o.replace(/^https?:\/\//, "");
const shortRef = (r: string) => `${r.slice(0, 4)}…${r.slice(-4)}`;
const usd = (n: number) =>
  "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const DEPLOY_URL =
  "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FstaccDOTsol%2Fpumprecovery&root-directory=pump%2Fpump-v2-frontend&project-name=stacc-mirror&repository-name=stacc-mirror&env=NEXT_PUBLIC_DEFAULT_REFERRER&envDescription=Your%20Solana%20wallet%20%E2%80%94%20earns%20top-of-tree%20referral%20fees%20on%20this%20mirror&envLink=https%3A%2F%2Fgithub.com%2FstaccDOTsol%2Fpumprecovery%2Fblob%2Fmain%2Fpump%2Fpump-v2-frontend%2F.env.example";

export default async function Page() {
  const statuses = await statusAll();
  const best = statuses.find((s) => s.ok)?.origin ?? null;
  const solPrice = await getSolPrice();
  const earnings = await earningsByReferrer(
    statuses.map((s) => s.defaultReferrer).filter(Boolean) as string[],
    solPrice
  );
  const totalEarnings = Object.values(earnings).reduce((a, b) => a + b, 0);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
      {/* TOP + BIGGEST: deploy-your-mirror CTA */}
      <section style={{ marginBottom: 36 }}>
        <a href={DEPLOY_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <h1
            style={{
              fontSize: "clamp(40px, 9vw, 72px)",
              lineHeight: 1.02,
              margin: 0,
              color: "#eafff1",
              letterSpacing: -1.5,
              fontWeight: 800,
            }}
          >
            Deploy your mirror
          </h1>
        </a>
        <p style={{ fontSize: "clamp(15px, 2.4vw, 20px)", color: "#bcd", margin: "12px 0 20px" }}>
          your own pump.fun in one click — and your wallet earns the top-of-tree
          referral fees on every trade that runs through it.
        </p>
        <a
          href={DEPLOY_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#7cfc9b",
            color: "#06210f",
            fontWeight: 800,
            fontSize: "clamp(18px, 3vw, 24px)",
            padding: "16px 30px",
            borderRadius: 12,
            textDecoration: "none",
            boxShadow: "0 0 0 1px #3ddc84, 0 8px 30px rgba(124,252,155,0.18)",
          }}
        >
          Deploy to Vercel → 1 click
        </a>
        <div style={{ marginTop: 12, fontSize: 13, color: "#8ab" }}>
          prompts only for your wallet ·{" "}
          <a href="https://github.com/staccDOTsol/pumprecovery/blob/main/pump/pump-v2-frontend/README.md">
            what is this?
          </a>
        </div>
      </section>

      <hr style={{ border: "none", borderTop: "1px solid #1e2a22", margin: "0 0 28px" }} />

      <h2 style={{ fontSize: 24, margin: 0, color: "#cfe9d6" }}>{REGISTRY_BRAND}</h2>
      <p style={{ color: "#9aa", marginTop: 4 }}>
        you&rsquo;re here for the stacc/jare show — it plays across a few mirrors.
        grab a live one below.
      </p>
      <p
        style={{
          marginTop: 12,
          fontSize: 15,
          color: "#cfe9d6",
          borderLeft: "3px solid #7cfc9b",
          paddingLeft: 12,
          fontStyle: "italic",
        }}
      >
        you managed to get google to b&amp; stacc.art: I raise you a game of
        whack-a-mole.
      </p>

      <section
        style={{
          border: "2px solid #ff5252",
          background: "#2a0d0d",
          color: "#ffd7d7",
          borderRadius: 10,
          padding: 16,
          margin: "20px 0",
          lineHeight: 1.55,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: "#ff7676",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          ⚠ Read this before you click anything
        </div>
        {MIRROR_WARNING}
      </section>

      {best && (
        <a
          href={best}
          style={{
            display: "inline-block",
            background: "#7cfc9b",
            color: "#06210f",
            fontWeight: 700,
            padding: "12px 18px",
            borderRadius: 8,
            textDecoration: "none",
            marginBottom: 18,
          }}
        >
          Take me to the show → {host(best)}
        </a>
      )}

      <h2 style={{ fontSize: 16, color: "#cfd", marginTop: 8 }}>
        now playing <span style={{ color: "#667", fontWeight: 400 }}>(mirrors)</span>
      </h2>

      {statuses.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {statuses.map((s) => {
            const earned = s.defaultReferrer ? earnings[s.defaultReferrer] ?? 0 : 0;
            return (
              <li
                key={s.origin}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid #1e2a22",
                  borderRadius: 8,
                  marginBottom: 8,
                  background: "#0e1410",
                  flexWrap: "wrap",
                }}
              >
                <span
                  title={s.ok ? "online" : "offline / unreachable"}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: s.ok ? "#3ddc84" : "#ff5252",
                    flex: "0 0 auto",
                  }}
                />
                <a href={s.origin} style={{ flex: 1, minWidth: 140 }}>
                  {host(s.origin)}
                </a>
                {s.defaultReferrer ? (
                  <span style={{ fontSize: 12, color: "#8ab", display: "flex", gap: 8, alignItems: "center" }}>
                    <a
                      href={`https://solscan.io/account/${s.defaultReferrer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`top-level referrer ${s.defaultReferrer}`}
                      style={{ color: "#8ab" }}
                    >
                      ref {shortRef(s.defaultReferrer)}
                    </a>
                    <span style={{ color: solPrice ? "#7cfc9b" : "#667" }}>
                      {solPrice ? `≈ ${usd(earned)}` : "—"}
                    </span>
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "#667" }}>no top-level ref set</span>
                )}
                <span
                  style={{
                    color: s.ok ? "#3ddc84" : "#ff7676",
                    fontSize: 12,
                    minWidth: 54,
                    textAlign: "right",
                  }}
                >
                  {s.ok ? "online" : "offline"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p style={{ color: "#778" }}>
          No mirrors yet. They self-register the first time their users hit the
          shared backend.
        </p>
      )}

      <p style={{ color: "#8ab", fontSize: 13, marginTop: 14 }}>
        Total est. referral earnings across mirrors:{" "}
        <strong style={{ color: "#7cfc9b" }}>
          {solPrice ? usd(totalEarnings) : "—"}
        </strong>{" "}
        <span style={{ color: "#667" }}>
          (recent on-chain inflow to each mirror&rsquo;s top-level referrer; estimate)
        </span>
      </p>

      <p style={{ color: "#778", fontSize: 12, marginTop: 18 }}>
        Deep links pass through: <code>{REGISTRY_BRAND}/&lt;path&gt;?ref=…</code>{" "}
        forwards to a working mirror, preserving the path and your referral.{" "}
        Want your own stage?{" "}
        <a
          href="https://github.com/staccDOTsol/pumprecovery/blob/main/pump/pump-v2-frontend/README.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          deploy your own mirror ↗
        </a>
      </p>
      <footer
        style={{
          color: "#566",
          fontSize: 12,
          marginTop: 16,
          borderTop: "1px solid #1e2a22",
          paddingTop: 12,
        }}
      >
        open-source ·{" "}
        <a href="https://github.com/staccDOTsol/pumprecovery">github</a> · not
        affiliated with or endorsed by pump.fun
      </footer>
    </main>
  );
}
