CREATE OR REPLACE FUNCTION public.get_total_virtual_sol_reserves()
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  total_reserves NUMERIC;
BEGIN
  SELECT SUM(virtual_sol_reserves - 30000000000) INTO total_reserves
  FROM coins;

  RETURN total_reserves;
END;
$function$
