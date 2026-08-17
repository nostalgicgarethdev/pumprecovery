CREATE INDEX idx_address ON public.balances USING btree (address);
CREATE INDEX idx_mint ON public.balances USING btree (mint);