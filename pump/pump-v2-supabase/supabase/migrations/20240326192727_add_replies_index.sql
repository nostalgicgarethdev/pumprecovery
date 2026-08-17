CREATE INDEX idx_replies_mint ON replies (mint);
CREATE INDEX idx_replies_hidden ON replies (hidden);
CREATE INDEX idx_replies_mint_hidden ON replies (mint, hidden);
CREATE INDEX idx_replies_id ON replies (id);
CREATE INDEX idx_replies_user ON replies ("user");

