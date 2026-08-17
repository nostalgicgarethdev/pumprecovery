ALTER TABLE public.replies ADD COLUMN by_admin TEXT;




------------------------------------------------------------




---------   ------------------------------------------------------------




CREATE TABLE super_admins (

    address TEXT NOT NULL,

    name TEXT NOT NULL

);




-- ------------------------------------------------------------




-- Create or update the function for logging both hide and unhide events

CREATE OR REPLACE FUNCTION public.log_reply_delete_events()

RETURNS TRIGGER AS $$

BEGIN

    IF NEW.hidden = TRUE AND OLD.hidden IS NOT TRUE THEN

        -- Log hiding the reply

        INSERT INTO public.moderator_logs (name, address, item, item_type, item_ID, action)

        SELECT admins.name, admins.address, 'reply', 'text', NEW.id, 'delete'

        FROM public.admins

        WHERE admins.address = NEW.by_admin;

    ELSIF NEW.hidden = FALSE AND OLD.hidden IS NOT FALSE THEN

        -- Log unhiding the reply

        INSERT INTO public.moderator_logs (name, address, item, item_type, item_ID, action)

        SELECT admins.name, admins.address, 'reply', 'text', NEW.id, 'undelete'

        FROM public.admins

        WHERE admins.address = NEW.by_admin;

    END IF;




    RETURN NEW;

END;

$$ LANGUAGE plpgsql;




-- Drop the existing visibility trigger if it exists

DROP TRIGGER IF EXISTS trigger_reply_delete_change ON public.replies;




-- Create a new trigger that handles both hiding and unhiding events

CREATE TRIGGER trigger_reply_delete_change

AFTER UPDATE ON public.replies

FOR EACH ROW

WHEN (NEW.hidden IS DISTINCT FROM OLD.hidden)

EXECUTE FUNCTION public.log_reply_delete_events();







------------------------------------------------------------




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




------------------------------------------------------------