-- Fix missing tables and columns for INTEGER based schema (matching seed.sql)

-- 1. Create missing 'questions' table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answer_content TEXT,
    answered_at TIMESTAMPTZ,
    answered_by INTEGER REFERENCES users(id)
);

-- 2. Add missing columns to 'users'
-- The controller expects these generic rating columns
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS rating_positive_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_negative_count INTEGER NOT NULL DEFAULT 0;

-- 3. Add missing columns to 'products'
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS seller_allows_unrated_bidders BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. Fix 'transactions' table column mismatch
-- Code expects 'price', but schema has 'final_price'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'final_price') THEN
        ALTER TABLE transactions RENAME COLUMN final_price TO price;
    END IF;
END $$;

-- 5. Ensure status columns are TEXT to avoid Enum issues with code strings ('SOLD', 'ACTIVE', etc.)
-- This is safer than managing Enums for this fix
ALTER TABLE products ALTER COLUMN status TYPE TEXT;
ALTER TABLE products ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE bids ALTER COLUMN status TYPE TEXT;
ALTER TABLE bids ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE transactions ALTER COLUMN status TYPE TEXT;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_product_created_at ON questions(product_id, created_at DESC);
