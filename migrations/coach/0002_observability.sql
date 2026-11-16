CREATE TABLE coach_activity (owner TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY(owner,day));
CREATE TABLE coach_monthly_activity (owner TEXT NOT NULL, month TEXT NOT NULL, PRIMARY KEY(owner,month));
CREATE TABLE coach_feedback (
 operation TEXT PRIMARY KEY REFERENCES coach_messages(operation) ON DELETE CASCADE,
 owner TEXT NOT NULL, rating TEXT CHECK(rating IN ('helpful','unhelpful','incorrect')),
 completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)), updated INTEGER NOT NULL
);
CREATE INDEX coach_feedback_owner ON coach_feedback(owner);
