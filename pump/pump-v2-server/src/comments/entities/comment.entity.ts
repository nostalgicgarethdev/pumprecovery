export class Comment {
  signature: string;
  is_confirmed: boolean;
  content: string;
  timestamp: number;
  mint_id?: string;
  user?: string;
  is_buy?: boolean;
  sol_amount?: number;
}
