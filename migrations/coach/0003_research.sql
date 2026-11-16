CREATE TABLE coach_research_consent (
 owner TEXT PRIMARY KEY REFERENCES coach_accounts(id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)), participant TEXT NOT NULL,
 epoch TEXT NOT NULL, version TEXT NOT NULL, updated INTEGER NOT NULL
);
CREATE TABLE coach_research_examples (
 id TEXT PRIMARY KEY, participant TEXT NOT NULL, payload TEXT NOT NULL, original_response TEXT NOT NULL,
 created INTEGER NOT NULL, expires INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','reviewed'))
);
CREATE INDEX coach_research_expiry ON coach_research_examples(expires);
CREATE TABLE coach_research_links (
 contribution TEXT PRIMARY KEY REFERENCES coach_research_examples(id) ON DELETE CASCADE,
 owner TEXT NOT NULL REFERENCES coach_accounts(id) ON DELETE CASCADE, source_operation TEXT NOT NULL,
 epoch TEXT NOT NULL, UNIQUE(owner,source_operation,epoch)
);
CREATE INDEX coach_research_owner ON coach_research_links(owner);
CREATE TABLE coach_research_requests (
 request_key TEXT PRIMARY KEY, source_operation TEXT NOT NULL,
 contribution TEXT NOT NULL REFERENCES coach_research_examples(id) ON DELETE CASCADE
);
CREATE TABLE coach_research_reviews (
 contribution TEXT PRIMARY KEY REFERENCES coach_research_examples(id) ON DELETE CASCADE,
 correction TEXT NOT NULL, reference_answer TEXT NOT NULL, assertions TEXT NOT NULL, teaching_criteria TEXT NOT NULL, categories TEXT NOT NULL,
 accuracy INTEGER NOT NULL CHECK(accuracy BETWEEN 0 AND 4), coaching_quality INTEGER NOT NULL CHECK(coaching_quality BETWEEN 0 AND 4),
 reviewer_ref TEXT NOT NULL, evaluation_version TEXT NOT NULL, privacy_approved INTEGER NOT NULL CHECK(privacy_approved=1),
 promotion_approved INTEGER NOT NULL CHECK(promotion_approved=1), reviewed INTEGER NOT NULL
);
CREATE TABLE coach_research_dataset_versions (
 version TEXT NOT NULL, contribution TEXT NOT NULL REFERENCES coach_research_examples(id) ON DELETE CASCADE,
 review_digest TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(version,contribution)
);
CREATE TRIGGER coach_research_approval AFTER INSERT ON coach_research_reviews BEGIN
 UPDATE coach_research_examples SET state='reviewed',expires=MIN(created+15552000000,NEW.reviewed+15552000000) WHERE id=NEW.contribution;
END;
CREATE TRIGGER coach_research_reapproval AFTER UPDATE ON coach_research_reviews BEGIN
 UPDATE coach_research_examples SET state='reviewed',expires=MIN(created+15552000000,NEW.reviewed+15552000000) WHERE id=NEW.contribution;
END;
CREATE TRIGGER coach_research_privacy_revision AFTER UPDATE OF payload,original_response ON coach_research_examples
WHEN NEW.payload!=OLD.payload OR NEW.original_response!=OLD.original_response BEGIN
 DELETE FROM coach_research_reviews WHERE contribution=NEW.id;
 DELETE FROM coach_research_dataset_versions WHERE contribution=NEW.id;
 UPDATE coach_research_examples SET state='pending',expires=MIN(expires,created+15552000000,unixepoch()*1000+2592000000) WHERE id=NEW.id;
END;
CREATE TRIGGER coach_research_withdraw AFTER UPDATE OF enabled ON coach_research_consent WHEN NEW.enabled=0 BEGIN
 DELETE FROM coach_research_examples WHERE id IN (SELECT contribution FROM coach_research_links WHERE owner=NEW.owner);
END;
CREATE TRIGGER coach_research_account_deletion AFTER UPDATE OF deleted ON coach_accounts WHEN NEW.deleted!=0 BEGIN
 DELETE FROM coach_research_examples WHERE id IN (SELECT contribution FROM coach_research_links WHERE owner=NEW.id);
 DELETE FROM coach_research_consent WHERE owner=NEW.id;
END;
CREATE TRIGGER coach_research_account_removal BEFORE DELETE ON coach_accounts BEGIN
 DELETE FROM coach_research_examples WHERE id IN (SELECT contribution FROM coach_research_links WHERE owner=OLD.id);
END;
