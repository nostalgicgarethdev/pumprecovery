export class Coin {
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
  raydium_pool?: string;
  complete: boolean;
  virtual_sol_reserves: string;
  virtual_token_reserves: string;
  hidden?: boolean;
  total_supply: string;
  show_name: boolean;
  last_trade_timestamp?: number;
  market_cap: number;
}
