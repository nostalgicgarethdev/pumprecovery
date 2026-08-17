-- File: migration_drop_function.sql

-- Drop the function associated with the trigger in the public schema, if it exists
DROP FUNCTION IF EXISTS public.log_ban_actions() CASCADE;
