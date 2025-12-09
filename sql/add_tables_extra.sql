-- Additional tables and columns for bidder features

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

CREATE TABLE IF NOT EXISTS watchlists (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS rating_positive_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_negative_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS seller_allows_unrated_bidders BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE bids
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_bids_product_created_at ON bids(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_product_created_at ON questions(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
