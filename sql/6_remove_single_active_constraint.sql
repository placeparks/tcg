-- Remove the unique constraint that only allows one active collection
-- This allows multiple collections to be active at the same time

DROP INDEX IF EXISTS one_active_collection;

-- Now you can set multiple collections to active = true
-- The system will match the code to the correct collection automatically
