-- Make candidate columns nullable — candidates are now chosen by users, not pre-selected by the system
ALTER TABLE daily_polls ALTER COLUMN candidate_1 DROP NOT NULL;
ALTER TABLE daily_polls ALTER COLUMN candidate_2 DROP NOT NULL;
ALTER TABLE daily_polls ALTER COLUMN candidate_3 DROP NOT NULL;
