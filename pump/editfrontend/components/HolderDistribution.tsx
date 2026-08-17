import { useBondingCurve } from "@/hooks/useBondingCurve";
import { Coin } from "@/hooks/useCoins";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, TokenAccountBalancePair } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { BN } from "bn.js";
import { useEffect, useState } from "react";

export const HolderDistribution = ({ coin }: { coin: Coin }) => {
  const [topHolders, setTopHolders] = useState<TokenAccountBalancePair[]>([]);
  const [devAccount, setDevAccount] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(false);
  const { bondingCurve, loading: bondingCurveLoading } = useBondingCurve(coin);
  const { connection } = useConnection();

  const fetchTopHolders = async () => {
    setLoading(true);

    const { value: largestAccounts } = await connection.getTokenLargestAccounts(
      new PublicKey(coin.mint)
    );

    const creatorAssociatedAccount = await getAssociatedTokenAddress(
      new PublicKey(coin.mint),
      new PublicKey(coin.creator)
    );

    setDevAccount(creatorAssociatedAccount);

    setTopHolders(largestAccounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchTopHolders();
  }, [coin, bondingCurve]);

  return (
    <div className="grid gap-2">
      <div className="font-bold">Holder distribution</div>
      <div className="text-sm">
        {loading || bondingCurveLoading ? (
          <div>Loading...</div>
        ) : !topHolders?.length ? (
          <div>No holders</div>
        ) : (
          <div className="grid gap-1">
            {topHolders.map(({ address, amount }, index) => (
              <div className="flex justify-between" key={index}>
                <a
                  className="hover:underline"
                  href={`https://solscan.io/account/${address.toBase58()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {index + 1}. {address.toBase58().slice(0, 6)}
                  {address.toBase58() === coin.associated_bonding_curve
                    ? " 🏦 (bonding curve)"
                    : null}
                  {devAccount && address.equals(devAccount)
                    ? " 🤵‍♂️ (dev)"
                    : null}
                </a>
                <div>
                  {bondingCurve &&
                    (
                      (new BN(amount)
                        .mul(new BN(10_000))
                        .div(bondingCurve.tokenTotalSupply)
                        .toNumber() /
                        10_000) *
                      100
                    ).toFixed(2)}
                  %
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
