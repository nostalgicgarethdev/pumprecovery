-- File: migration_create_function_with_new_name.sql

-- Create the function within the public schema with a new name
CREATE OR REPLACE FUNCTION public.log_ban_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Retrieve the user ID from the 'replies' table where 'origin' from 'bans' matches 'user' in 'replies'
    -- Insert a new record into 'moderator_logs' with the corresponding details
    INSERT INTO public.moderator_logs (address, item, item_type, item_id, action)
    SELECT NEW.by_admin, 'user', 'user wallet', replies.user, 'ban'
    FROM public.replies
    WHERE replies.user = NEW.origin;
    
    -- Complete the function by returning the new row to indicate success
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger in the public schema that fires after a new row is added to the 'bans' table
-- and uses the new function name
CREATE TRIGGER trigger_after_ban
AFTER INSERT ON public.bans
FOR EACH ROW
EXECUTE FUNCTION public.log_ban_events();