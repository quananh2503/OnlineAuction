-- =====================================================
-- TẠO DỮ LIỆU ĐẤU GIÁ TỰ ĐỘNG VỚI TRIGGER
-- =====================================================
-- Script này tạo trigger để tự động cập nhật products
-- khi có bid mới, sau đó sinh nhiều bids giả
-- =====================================================

-- Bước 1: Tạo trigger function để tự động cập nhật products khi có bid mới
CREATE OR REPLACE FUNCTION update_product_on_bid()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ cập nhật nếu bid có status = 'ACTIVE'
    IF NEW.status = 'ACTIVE' THEN
        UPDATE products
        SET 
            current_price = NEW.price,
            winner_id = NEW.bidder_id,
            bid_count = COALESCE(bid_count, 0) + 1
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bước 2: Gắn trigger vào bảng bids
DROP TRIGGER IF EXISTS trigger_update_product_on_bid ON bids;
CREATE TRIGGER trigger_update_product_on_bid
    AFTER INSERT ON bids
    FOR EACH ROW
    EXECUTE FUNCTION update_product_on_bid();

-- =====================================================
-- Bước 3: Xóa bids cũ và reset products về trạng thái ban đầu
-- =====================================================

-- Xóa tất cả bids
TRUNCATE TABLE bids RESTART IDENTITY CASCADE;

-- Reset products về giá khởi điểm
UPDATE products 
SET 
    current_price = starting_price,
    winner_id = NULL,
    bid_count = 0
WHERE status = 'ACTIVE';

-- =====================================================
-- Bước 4: Tạo dữ liệu đấu giá giả
-- =====================================================

DO $$
DECLARE
    product_record RECORD;
    bidder_record RECORD;
    current_bid_price DECIMAL(18,2);
    max_bids INTEGER;
    bid_count INTEGER;
    random_bidder_id INTEGER;
BEGIN
    -- Lặp qua tất cả products đang ACTIVE
    FOR product_record IN 
        SELECT 
            p.id,
            p.starting_price,
            p.price_step,
            p.buy_now_price,
            p.seller_id
        FROM products p
        WHERE p.status = 'ACTIVE'
          AND p.ends_at > NOW() -- Chỉ lấy sản phẩm chưa hết hạn
    LOOP
        -- Random số lượng bids (từ 3 đến 15 bids)
        max_bids := 3 + floor(random() * 13)::int;
        current_bid_price := product_record.starting_price;
        
        -- Tạo nhiều bids cho product này
        FOR bid_count IN 1..max_bids LOOP
            -- Tăng giá theo bước giá
            current_bid_price := current_bid_price + product_record.price_step;
            
            -- Đảm bảo giá không vượt quá buy_now_price (nếu có)
            IF product_record.buy_now_price IS NOT NULL AND 
               current_bid_price >= product_record.buy_now_price THEN
                -- Đặt giá = buy_now_price - 1 bước giá để chừa chỗ
                current_bid_price := product_record.buy_now_price - product_record.price_step;
                EXIT; -- Dừng tạo thêm bids
            END IF;
            
            -- Chọn random bidder (không phải seller)
            SELECT id INTO random_bidder_id
            FROM users
            WHERE role IN ('BIDDER', 'SELLER') -- Có thể là seller nhưng không phải seller của product này
              AND id != product_record.seller_id -- Không phải seller của product này
              AND name NOT LIKE 'seller%' -- Loại trừ users có tên bắt đầu bằng 'seller'
              AND name NOT LIKE 'Seller%'
            ORDER BY random()
            LIMIT 1;
            
            -- Nếu không tìm được bidder, bỏ qua
            IF random_bidder_id IS NULL THEN
                CONTINUE;
            END IF;
            
            -- Insert bid (trigger sẽ tự động cập nhật products)
            INSERT INTO bids (product_id, bidder_id, price, status, created_at)
            VALUES (
                product_record.id,
                random_bidder_id,
                current_bid_price,
                'ACTIVE',
                NOW() - (max_bids - bid_count) * interval '1 hour' -- Tạo thời gian cách nhau 1 giờ
            );
            
            -- Random delay nhỏ để tạo thời gian khác nhau
            PERFORM pg_sleep(0.001);
        END LOOP;
        
        RAISE NOTICE 'Created % bids for product ID: %', max_bids, product_record.id;
    END LOOP;
END $$;

-- =====================================================
-- Bước 5: Hiển thị kết quả
-- =====================================================

-- Thống kê tổng quan
SELECT 
    'Total Products' as metric,
    COUNT(*) as value
FROM products
WHERE status = 'ACTIVE'

UNION ALL

SELECT 
    'Total Bids' as metric,
    COUNT(*) as value
FROM bids
WHERE status = 'ACTIVE'

UNION ALL

SELECT 
    'Avg Bids per Product' as metric,
    ROUND(AVG(bid_count), 2) as value
FROM products
WHERE status = 'ACTIVE' AND bid_count > 0;

-- Xem mẫu products với bids
SELECT 
    p.id,
    p.name,
    p.starting_price,
    p.current_price,
    p.buy_now_price,
    p.bid_count,
    u.name as current_winner
FROM products p
LEFT JOIN users u ON p.winner_id = u.id
WHERE p.status = 'ACTIVE'
  AND p.bid_count > 0
ORDER BY p.bid_count DESC
LIMIT 10;

-- Xem chi tiết bids của 1 product
SELECT 
    b.id,
    b.product_id,
    u.name as bidder_name,
    b.price,
    b.created_at
FROM bids b
JOIN users u ON b.bidder_id = u.id
WHERE b.product_id = (SELECT id FROM products WHERE status = 'ACTIVE' AND bid_count > 0 LIMIT 1)
ORDER BY b.created_at ASC;

-- =====================================================
-- LƯU Ý:
-- - Trigger đã được tạo và sẽ tự động hoạt động
-- - Mỗi khi INSERT bid mới, products sẽ tự động update
-- - Không cần viết logic cập nhật thủ công nữa!
-- =====================================================
