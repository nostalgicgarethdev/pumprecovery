 CREATE TABLE moderator_logs (
    logID SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    item TEXT NOT NULL CHECK (item IN ('term', 'user', 'reply', 'coin')),
    item_type TEXT NOT NULL CHECK (item_type IN ('text', 'user wallet', 'replyId', 'mintId')),
    item_ID TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('ban', 'unban', 'delete', 'undelete', 'mark as NSFW', 'unmark as NSFW', 'mark as SFW', 'unmark as SFW')),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);