CREATE INDEX idx_notifications_user ON notifications("user");
CREATE INDEX idx_notifications_isread_false ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_isread ON notifications("user", is_read);
