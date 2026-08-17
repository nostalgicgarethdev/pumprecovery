import { useEffect, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { useDebounce } from "@uidotdev/usehooks";
import { useIpfsPrefix } from "@/providers/IpfsPrefixProvider";

export interface Coin {
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  mint: string;
  creator: string;
  created_timestamp: number;
  raydium_pool: string;
  complete: boolean;
  twitter_username: string;
  pfp: string;
  hidden: boolean | null;
  sortValue: any;
  virtual_sol_reserves: string;
  virtual_token_reserves: string;
  total_supply: string;
  show_name: boolean;
  market_cap: number;
  usd_market_cap: number;
  king_of_the_hill_timestamp: number | null;
  reply_count: number;
  nsfw: boolean;
  market_id: string | null;
  inverted: boolean | null;
  username?: string;
  profile_image?: string;
  should_animate?: boolean;
}

export const useCoins = ({
  sort,
  order,
  offset,
  limit,
  searchTerm,
  includeNsfw,
  creator,
}: {
  sort: string;
  order: string;
  searchTerm?: string;
  offset: number;
  limit: number;
  includeNsfw: boolean;
  creator?: string;
}) => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(false);
  const { ipfsPrefix } = useIpfsPrefix();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedOffset = useDebounce(offset, 500);

  const fetchCoins = async () => {
    setLoading(true);

    let queryParams = `offset=${debouncedOffset}&limit=${limit}&sort=${sort}&order=${order}&includeNsfw=${includeNsfw}`;

    if (debouncedSearchTerm) {
      queryParams += `&searchTerm=${encodeURIComponent(debouncedSearchTerm)}`;
    }

    if (creator) {
      queryParams += `&creator=${creator}`;
    }

    const coins = await fetch(
      `${process.env.NEXT_PUBLIC_CLIENT_API_URL}/coins?${queryParams}`
    ).then((r) => r.json());

    const updatedCoins = coins.map((coin: Coin) => {
      coin.image_uri = coin.image_uri.replace(
        "https://cf-ipfs.com/ipfs/",
        ipfsPrefix
      );

      coin.metadata_uri = coin.metadata_uri.replace(
        "https://cf-ipfs.com/ipfs/",
        ipfsPrefix
      );

      return coin;
    });

    setCoins(updatedCoins);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoins();
  }, [
    sort,
    order,
    ipfsPrefix,
    debouncedSearchTerm,
    debouncedOffset,
    limit,
    includeNsfw,
  ]);

  return { coins, setCoins, loading, fetchCoins };
};
