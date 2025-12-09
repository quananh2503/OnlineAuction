-- Align database schema with the application code
-- Run this script to create missing tables and update existing ones to match the code's expectations.

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure products table has correct columns (if not already)
-- Note: This assumes products table exists. If columns are missing, you might need to add them.
-- The code expects: seller_id, category_id, name, starts_at, ends_at, starting_price, price_step, buy_now_price, avatar_url, current_price, status, bid_count, winner_id, seller_allows_unrated_bidders

-- 3. Create 'descriptions' table
CREATE TABLE IF NOT EXISTS descriptions (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    content TEXT NOT NULL
);

-- 4. Create 'images' table
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT NOT NULL -- 'AVATAR' or 'SECONDARY'
);

-- 5. Create 'questions' table (using UUIDs)
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answer_content TEXT,
    answered_at TIMESTAMPTZ,
    answered_by UUID REFERENCES users(id)
);

-- 6. Create 'watchlists' table (using UUIDs)
CREATE TABLE IF NOT EXISTS watchlists (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);

-- 7. Create 'bids' table compatible with code (using UUIDs)
-- Drop old bids table if it has wrong schema (be careful with data loss!)
-- DROP TABLE IF EXISTS bids; 
CREATE TABLE IF NOT EXISTS bids (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price NUMERIC(14, 2) NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Create 'transactions' table (using UUIDs)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_questions_product_created_at ON questions(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_bids_product_created_at ON bids(product_id, created_at DESC);
