-- Create or update the function within the public schema
CREATE OR REPLACE FUNCTION public.log_ban_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new record into 'moderator_logs' using details from the 'bans', 'admins', and 'replies' tables
    INSERT INTO public.moderator_logs (name, address, item, item_type, item_ID, action)
    SELECT admins.name, admins.address, 'user', 'user wallet', replies.user, 'ban'
    FROM public.replies
    INNER JOIN public.admins ON admins.address = NEW.by_admin
    WHERE replies.origin = NEW.origin;

    -- Return the new row to indicate success
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_after_ban ON public.bans;

-- Create a new trigger that uses the updated function
CREATE TRIGGER trigger_after_ban
AFTER INSERT ON public.bans
FOR EACH ROW
EXECUTE FUNCTION public.log_ban_events();
