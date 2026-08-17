CREATE OR REPLACE FUNCTION log_user_ban() 
RETURNS TRIGGER AS $$
BEGIN
    -- Determine if the action is a ban or unban based on the 'expires' column
    IF NEW.expires > 0 THEN
        -- It's a ban
        INSERT INTO moderator_logs (name, address, item, item_type, item_ID, action)
        SELECT admin.name, admin.address, 'user', 'user wallet', replies.user, 'ban'
        FROM admin
        JOIN replies ON replies.origin = NEW.origin
        WHERE admin.address = NEW.handled_by_admin; -- assuming you pass admin address in handled_by_admin
    ELSE
        -- It's an unban
        INSERT INTO moderator_logs (name, address, item, item_type, item_ID, action)
        SELECT admin.name, admin.address, 'user', 'user wallet', replies.user, 'unban'
        FROM admin
        JOIN replies ON replies.origin = NEW.origin
        WHERE admin.address = NEW.handled_by_admin;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;