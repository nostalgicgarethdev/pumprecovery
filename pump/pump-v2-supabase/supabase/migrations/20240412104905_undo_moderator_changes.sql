ALTER TABLE public.replies DROP COLUMN by_admin;

DROP FUNCTION delete_replies_with_banned_terms();
DROP TRIGGER trigger_after_insert_ban_terms ON ban_terms;
DROP FUNCTION update_replies_visibility();
DROP FUNCTION unban_user_by_origin(TEXT);

ALTER TABLE admins
ALTER COLUMN name DROP DEFAULT,
ALTER COLUMN name DROP NOT NULL;

DROP TABLE moderator_logs;
DROP FUNCTION log_user_ban();
ALTER TABLE bans DROP COLUMN by_admin;
DROP TRIGGER trigger_after_ban ON public.bans;
DROP FUNCTION public.log_ban_events();

DROP TRIGGER trigger_reply_delete_change ON public.replies;
drop function public.log_reply_delete_events();
