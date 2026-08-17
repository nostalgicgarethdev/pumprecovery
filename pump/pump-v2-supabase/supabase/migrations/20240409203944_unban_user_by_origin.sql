CREATE OR REPLACE FUNCTION unban_user_by_origin(user_wallet TEXT)
RETURNS VOID AS $$
BEGIN
    -- Update the expires in the bans table
    UPDATE bans
    SET expires = 0
    WHERE origin IN (
        SELECT DISTINCT origin
        FROM replies
        WHERE user = user_wallet
    );
END;
$$ LANGUAGE plpgsql;
