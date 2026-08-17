-- Add this to your migration script for handling newly inserted banned terms
CREATE TRIGGER trigger_after_insert_ban_terms
AFTER INSERT ON ban_terms
FOR EACH ROW
EXECUTE FUNCTION update_replies_visibility();
