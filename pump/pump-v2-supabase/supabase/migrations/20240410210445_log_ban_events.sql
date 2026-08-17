-- Adjust and create the new function within the public schema
CREATE OR REPLACE FUNCTION public.log_ban_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new record into 'moderator_logs' using details from the 'bans' and 'replies' tables
    -- The by_admin should map to the admin's address if they match
    INSERT INTO public.moderator_logs (address, item, item_type, item_id, action)
    SELECT admins.address, 'user', 'user wallet', replies.id, 'ban'
    FROM public.replies
    JOIN public.admins ON admins.address = NEW.by_admin
    WHERE replies.origin = NEW.origin;
    
    -- Return the new row to indicate success
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_after_ban ON public.bans;

-- Create or replace the trigger that fires after a new row is added to the 'bans' table
CREATE TRIGGER trigger_after_ban
AFTER INSERT ON public.bans
FOR EACH ROW
EXECUTE FUNCTION public.log_ban_events();
