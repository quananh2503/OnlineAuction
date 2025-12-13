-- =====================================================
-- TẠO RATING DATA TỪ TRANSACTIONS HIỆN CÓ
-- =====================================================
-- Script này tạo 2 rating records cho mỗi transaction:
-- 1. Buyer đánh giá Seller
-- 2. Seller đánh giá Buyer
-- =====================================================

-- Bước 1: Xóa tất cả ratings cũ (nếu có)
TRUNCATE TABLE ratings RESTART IDENTITY CASCADE;

-- Bước 2: Insert ratings - Buyer đánh giá Seller
INSERT INTO ratings (transaction_id, from_user_id, to_user_id, score, content, created_at)
SELECT 
    t.id as transaction_id,
    t.buyer_id as from_user_id,
    t.seller_id as to_user_id,
    -- Random score: 80% positive (+1), 20% negative (-1)
    CASE WHEN random() < 0.8 THEN 1 ELSE -1 END as score,
    -- Nội dung đánh giá của buyer cho seller
    CASE 
        WHEN random() < 0.8 THEN 
            CASE floor(random() * 5)::int
                WHEN 0 THEN 'Người bán rất tốt, giao hàng đúng hẹn!'
                WHEN 1 THEN 'Sản phẩm chất lượng, đóng gói cẩn thận. Rất hài lòng!'
                WHEN 2 THEN 'Người bán nhiệt tình, tư vấn chu đáo!'
                WHEN 3 THEN 'Giao dịch nhanh chóng, sản phẩm đúng mô tả!'
                ELSE 'Rất tốt! Sẽ mua lại lần sau!'
            END
        ELSE 
            CASE floor(random() * 3)::int
                WHEN 0 THEN 'Sản phẩm không đúng mô tả, rất thất vọng.'
                WHEN 1 THEN 'Người bán phản hồi chậm, giao hàng trễ.'
                ELSE 'Chất lượng kém, không như quảng cáo.'
            END
    END as content,
    -- Random created_at trong vòng 7 ngày sau transaction
    t.created_at + (random() * interval '7 days') as created_at
FROM transactions t
WHERE t.status IN ('COMPLETED', 'PAYMENT_RECEIVED')
ORDER BY t.id;

-- Bước 3: Insert ratings - Seller đánh giá Buyer
INSERT INTO ratings (transaction_id, from_user_id, to_user_id, score, content, created_at)
SELECT 
    t.id as transaction_id,
    t.seller_id as from_user_id,
    t.buyer_id as to_user_id,
    -- Random score: 85% positive (+1), 15% negative (-1)
    CASE WHEN random() < 0.85 THEN 1 ELSE -1 END as score,
    -- Nội dung đánh giá của seller cho buyer
    CASE 
        WHEN random() < 0.85 THEN 
            CASE floor(random() * 5)::int
                WHEN 0 THEN 'Người mua thanh toán nhanh, giao dịch suôn sẻ!'
                WHEN 1 THEN 'Rất tốt! Hy vọng được giao dịch lại!'
                WHEN 2 THEN 'Người mua dễ tính, thanh toán đúng hẹn!'
                WHEN 3 THEN 'Giao dịch tốt, không có vấn đề gì!'
                ELSE 'Khách hàng dễ thương, 5 sao!'
            END
        ELSE 
            CASE floor(random() * 3)::int
                WHEN 0 THEN 'Người mua thanh toán chậm, phải nhắc nhiều lần.'
                WHEN 1 THEN 'Giao dịch khó khăn, người mua hay thay đổi ý kiến.'
                ELSE 'Người mua không trả lời tin nhắn, mất thời gian.'
            END
    END as content,
    -- Random created_at trong vòng 7 ngày sau transaction
    t.created_at + (random() * interval '7 days') as created_at
FROM transactions t
WHERE t.status IN ('COMPLETED', 'PAYMENT_RECEIVED')
ORDER BY t.id;

-- Bước 4: Cập nhật lại rating stats cho users
-- (Chạy script sync_user_ratings.sql để đồng bộ lại)

-- =====================================================
-- KIỂM TRA KẾT QUẢ
-- =====================================================

-- Đếm số lượng ratings đã tạo
SELECT 
    'Total Ratings' as type,
    COUNT(*) as count
FROM ratings

UNION ALL

SELECT 
    'Buyer -> Seller' as type,
    COUNT(*) as count
FROM ratings r
JOIN transactions t ON r.transaction_id = t.id
WHERE r.from_user_id = t.buyer_id

UNION ALL

SELECT 
    'Seller -> Buyer' as type,
    COUNT(*) as count
FROM ratings r
JOIN transactions t ON r.transaction_id = t.id
WHERE r.from_user_id = t.seller_id;

-- Xem mẫu ratings vừa tạo
SELECT 
    r.id,
    t.id as transaction_id,
    CASE 
        WHEN r.from_user_id = t.buyer_id THEN 'Buyer → Seller'
        ELSE 'Seller → Buyer'
    END as rating_type,
    r.score,
    r.content,
    r.created_at
FROM ratings r
JOIN transactions t ON r.transaction_id = t.id
ORDER BY t.id, rating_type
LIMIT 10;

-- =====================================================
-- LƯU Ý: 
-- Sau khi chạy script này, nhớ chạy sync_user_ratings.sql
-- để cập nhật lại các trường rating trong bảng users!
-- =====================================================
