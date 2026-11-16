PRAGMA foreign_keys = ON;
CREATE TABLE coach_accounts (
 id TEXT PRIMARY KEY, generation TEXT NOT NULL, background TEXT NOT NULL DEFAULT '', goal TEXT NOT NULL DEFAULT '',
 created INTEGER NOT NULL, updated INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE coach_conversations (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES coach_accounts(id) ON DELETE CASCADE,
 generation TEXT NOT NULL, goal TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
 state TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX coach_conversations_owner ON coach_conversations(owner, updated);
CREATE INDEX coach_conversations_expiry ON coach_conversations(expires);
CREATE TABLE coach_messages (
 operation TEXT PRIMARY KEY, owner TEXT NOT NULL, conversation TEXT NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL, question TEXT NOT NULL, response TEXT NOT NULL, metadata TEXT NOT NULL,
 created INTEGER NOT NULL, UNIQUE(conversation, revision)
);
CREATE INDEX coach_messages_owner ON coach_messages(owner, conversation, revision);
