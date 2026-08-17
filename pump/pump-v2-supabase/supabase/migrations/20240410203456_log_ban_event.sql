-- Assuming PostgreSQL as the SQL database system
CREATE OR REPLACE FUNCTION log_ban_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Retrieve the user ID from the 'replies' table where 'origin' from 'bans' matches 'user' in 'replies'
    -- Insert a new record into 'moderator_logs' with the corresponding details
    INSERT INTO moderator_logs (address, item, item_type, item_id, action)
    SELECT NEW.by_admin, 'user', 'user wallet', replies.user, 'ban'
    FROM replies
    WHERE replies.user = NEW.origin;
    
    -- Complete the function by returning the new row to indicate success
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires after a new row is added to the 'bans' table
CREATE TRIGGER trigger_after_ban
AFTER INSERT ON bans
FOR EACH ROW
EXECUTE FUNCTION log_ban_event();
