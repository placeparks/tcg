-- Script to activate multiple collections for minting
-- Run this in Supabase SQL Editor

-- Step 1: Remove the single-active constraint (if it exists)
DROP INDEX IF EXISTS one_active_collection;

-- Step 2: Activate all collections you want to be mintable
-- You can activate as many as you want!

UPDATE public.collections 
SET active = true 
WHERE address IN (
  '0xb6d7d7c3d55c0eb5131daa8c8b9c9ca8cf17c71e',  -- ERC1155
  '0xbe12e668e66f3437f9a1a3d32b1acbbecc705f74'   -- ERC721
  -- Add more addresses here if needed
);

-- Step 3: Verify active collections
SELECT address, active, collection_type, cid, 
       jsonb_array_length(codes::jsonb) as num_codes
FROM public.collections 
WHERE active = true
ORDER BY collection_type, created_at;
