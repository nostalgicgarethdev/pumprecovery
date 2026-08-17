CREATE OR REPLACE FUNCTION public.unban_user_by_origin(user_wallet text)
RETURNS void AS
$$
BEGIN
    UPDATE bans
    SET expires = 0
    WHERE origin IN (
        SELECT DISTINCT origin
        FROM replies
        WHERE user = user_wallet
    );
END;
$$ LANGUAGE plpgsql;
