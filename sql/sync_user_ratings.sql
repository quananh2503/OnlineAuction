-- =====================================================
-- ĐỒNG BỘ LẠI RATING TRONG BẢNG USERS
-- =====================================================
-- Script này tính toán lại tất cả các trường rating 
-- trong bảng users dựa trên dữ liệu thực tế từ 
-- bảng ratings và transactions
-- =====================================================

-- Step 1: Tính toán ratings cho SELLER (người bán nhận đánh giá từ buyer)
WITH seller_ratings AS (
    SELECT 
        t.seller_id AS user_id,
        COUNT(r.id) AS total_count,
        COUNT(CASE WHEN r.score > 0 THEN 1 END) AS positive_count,
        COALESCE(AVG(CASE WHEN r.score > 0 THEN 1.0 ELSE 0.0 END), 0) AS avg_rating
    FROM ratings r
    JOIN transactions t ON r.transaction_id = t.id
    WHERE r.to_user_id = t.seller_id  -- Rating dành cho seller
    GROUP BY t.seller_id
),

-- Step 2: Tính toán ratings cho BIDDER (người mua nhận đánh giá từ seller)
bidder_ratings AS (
    SELECT 
        t.buyer_id AS user_id,
        COUNT(r.id) AS total_count,
        COUNT(CASE WHEN r.score > 0 THEN 1 END) AS positive_count,
        COALESCE(AVG(CASE WHEN r.score > 0 THEN 1.0 ELSE 0.0 END), 0) AS avg_rating
    FROM ratings r
    JOIN transactions t ON r.transaction_id = t.id
    WHERE r.to_user_id = t.buyer_id  -- Rating dành cho buyer
    GROUP BY t.buyer_id
)

-- Step 3: Update bảng users
UPDATE users u
SET 
    -- Seller ratings
    seller_total_ratings_count = COALESCE(sr.total_count, 0),
    seller_positive_ratings_count = COALESCE(sr.positive_count, 0),
    seller_average_rating = CASE 
        WHEN COALESCE(sr.total_count, 0) > 0 THEN sr.avg_rating 
        ELSE NULL 
    END,
    
    -- Bidder ratings
    bidder_total_ratings_count = COALESCE(br.total_count, 0),
    bidder_positive_ratings_count = COALESCE(br.positive_count, 0),
    bidder_average_rating = CASE 
        WHEN COALESCE(br.total_count, 0) > 0 THEN br.avg_rating 
        ELSE NULL 
    END
FROM 
    seller_ratings sr
    FULL OUTER JOIN bidder_ratings br ON sr.user_id = br.user_id
WHERE 
    u.id = COALESCE(sr.user_id, br.user_id);

-- Step 4: Reset users không có rating nào về 0
UPDATE users
SET 
    seller_total_ratings_count = 0,
    seller_positive_ratings_count = 0,
    seller_average_rating = NULL,
    bidder_total_ratings_count = 0,
    bidder_positive_ratings_count = 0,
    bidder_average_rating = NULL
WHERE 
    id NOT IN (
        SELECT DISTINCT t.seller_id FROM ratings r JOIN transactions t ON r.transaction_id = t.id WHERE r.to_user_id = t.seller_id
        UNION
        SELECT DISTINCT t.buyer_id FROM ratings r JOIN transactions t ON r.transaction_id = t.id WHERE r.to_user_id = t.buyer_id
    );

-- =====================================================
-- KẾT QUẢ: Hiển thị thống kê sau khi sync
-- =====================================================
SELECT 
    'SELLER' as role,
    COUNT(*) as users_with_ratings,
    SUM(seller_total_ratings_count) as total_ratings,
    AVG(seller_average_rating) as avg_rating_score
FROM users 
WHERE seller_total_ratings_count > 0

UNION ALL

SELECT 
    'BIDDER' as role,
    COUNT(*) as users_with_ratings,
    SUM(bidder_total_ratings_count) as total_ratings,
    AVG(bidder_average_rating) as avg_rating_score
FROM users 
WHERE bidder_total_ratings_count > 0;
