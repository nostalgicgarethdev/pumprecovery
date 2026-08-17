CREATE OR REPLACE FUNCTION public.get_buyer_count_by_mint()
 RETURNS TABLE(mint text, symbol text, buyer_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    trades.mint::TEXT, 
    coins.symbol::TEXT, -- Get the symbol from the coins table
    COUNT(DISTINCT trades."user") AS buyer_count
  FROM trades
  JOIN coins ON trades.mint = coins.mint -- Join trades with coins on mint
  GROUP BY trades.mint, coins.symbol -- Group by trades.mint and coins.symbol
  ORDER BY buyer_count DESC;
END; $function$
