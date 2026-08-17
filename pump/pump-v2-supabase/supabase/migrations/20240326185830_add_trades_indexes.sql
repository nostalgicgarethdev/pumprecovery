CREATE INDEX idx_trades_timestamp ON trades ("timestamp");
CREATE INDEX idx_trades_mint ON trades(mint);
CREATE INDEX idx_coins_mint ON coins(mint);