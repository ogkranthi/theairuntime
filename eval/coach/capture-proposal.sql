-- PRIVATE CAPTURE PROPOSAL ONLY. No production binding or runtime writer exists.
-- Apply only after separate owner approval of resources, consent and retention.
PRAGMA foreign_keys = ON;
CREATE TABLE contributed_examples (
  id TEXT PRIMARY KEY,
  exchange_hash TEXT NOT NULL UNIQUE CHECK(length(exchange_hash)=64),
  deletion_receipt_hash TEXT NOT NULL UNIQUE CHECK(length(deletion_receipt_hash)=64),
  question_redacted TEXT NOT NULL CHECK(length(question_redacted) BETWEEN 1 AND 2000),
  answer_redacted TEXT NOT NULL CHECK(length(answer_redacted) BETWEEN 1 AND 3000),
  source_ids_json TEXT NOT NULL CHECK(json_valid(source_ids_json) AND json_type(source_ids_json)='array'),
  consent_accepted INTEGER NOT NULL CHECK(consent_accepted=1),
  consent_version TEXT NOT NULL CHECK(consent_version='fde-exchange-consent-v1'),
  feedback_label TEXT CHECK(feedback_label IS NULL OR feedback_label IN ('helpful','incorrect')),
  consented_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at>consented_at AND expires_at<=consented_at+604800),
  review_state TEXT NOT NULL DEFAULT 'pending' CHECK(review_state IN ('pending','accepted','rejected'))
);
CREATE INDEX contributed_expiry ON contributed_examples(expires_at);
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  example_id TEXT NOT NULL REFERENCES contributed_examples(id) ON DELETE CASCADE,
  reviewer_owner_id TEXT NOT NULL CHECK(length(reviewer_owner_id)>0),
  rubric_version TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('accepted','rejected')),
  redaction_notes TEXT NOT NULL,
  reviewed_at INTEGER NOT NULL
);
CREATE TABLE evaluation_runs (
  id TEXT PRIMARY KEY,
  dataset_digest TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('synthetic_public','private_consented')),
  rubric_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  retrieval_version TEXT NOT NULL,
  model_id TEXT,
  attempts INTEGER NOT NULL CHECK(attempts>=0),
  reported_tokens INTEGER CHECK(reported_tokens IS NULL OR reported_tokens>=0),
  estimated_cost_usd REAL CHECK(estimated_cost_usd IS NULL OR estimated_cost_usd>=0),
  outcome TEXT NOT NULL CHECK(outcome IN ('fixture_only','review_pending','reviewed','blocked')),
  created_at INTEGER NOT NULL
);
