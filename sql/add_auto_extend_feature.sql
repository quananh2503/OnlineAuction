-- =====================================================
-- THÊM TỰ ĐỘNG GIA HẠN THỜI GIAN ĐẤU GIÁ
-- =====================================================
-- Script này thêm logic auto-extend vào trigger
-- Khi có bid mới, nếu product có auto_extend = true
-- thì sẽ gia hạn ends_at
-- =====================================================

-- Bước 1: Tạo bảng settings cho admin config
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert setting mặc định: gia hạn 5 phút
INSERT INTO system_settings (key, value, description)
VALUES ('auto_extend_minutes', '5', 'Số phút gia hạn tự động khi có bid mới')
ON CONFLICT (key) DO NOTHING;

-- Bước 2: Cập nhật trigger function để hỗ trợ auto-extend
CREATE OR REPLACE FUNCTION update_product_on_bid()
RETURNS TRIGGER AS $$
DECLARE
    extend_minutes INTEGER;
    new_ends_at TIMESTAMPTZ;
BEGIN
    -- Chỉ cập nhật nếu bid có status = 'ACTIVE'
    IF NEW.status = 'ACTIVE' THEN
        -- Lấy cấu hình thời gian gia hạn từ settings
        SELECT value::INTEGER INTO extend_minutes
        FROM system_settings
        WHERE key = 'auto_extend_minutes';
        
        -- Mặc định 5 phút nếu không có setting
        IF extend_minutes IS NULL THEN
            extend_minutes := 5;
        END IF;
        
        -- Kiểm tra xem product có bật auto_extend không
        SELECT 
            CASE 
                WHEN auto_extend = true THEN
                    -- Tính ends_at mới = MAX(NOW() + extend_minutes, ends_at hiện tại)
                    GREATEST(NOW() + (extend_minutes || ' minutes')::INTERVAL, ends_at)
                ELSE
                    ends_at -- Giữ nguyên nếu không auto-extend
            END
        INTO new_ends_at
        FROM products
        WHERE id = NEW.product_id;
        
        -- Cập nhật products
        UPDATE products
        SET 
            current_price = NEW.price,
            winner_id = NEW.bidder_id,
            bid_count = COALESCE(bid_count, 0) + 1,
            ends_at = new_ends_at -- Cập nhật thời gian kết thúc mới
        WHERE id = NEW.product_id;
        
        -- Log để debug (optional)
        RAISE NOTICE 'Product % - Bid from user % - New ends_at: %', 
            NEW.product_id, NEW.bidder_id, new_ends_at;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bước 3: Recreate trigger (nếu đã có sẵn)
DROP TRIGGER IF EXISTS trigger_update_product_on_bid ON bids;
CREATE TRIGGER trigger_update_product_on_bid
    AFTER INSERT ON bids
    FOR EACH ROW
    EXECUTE FUNCTION update_product_on_bid();

-- =====================================================
-- Bước 4: Test với một vài products
-- =====================================================

-- Bật auto_extend cho một vài products để test
UPDATE products
SET auto_extend = true
WHERE id IN (
    SELECT id 
    FROM products 
    WHERE status = 'ACTIVE' 
    LIMIT 5
);

-- =====================================================
-- KIỂM TRA KẾT QUẢ
-- =====================================================

-- Xem setting hiện tại
SELECT * FROM system_settings WHERE key = 'auto_extend_minutes';

-- Xem products có auto_extend
SELECT 
    id,
    name,
    auto_extend,
    ends_at,
    bid_count,
    status
FROM products
WHERE status = 'ACTIVE'
ORDER BY auto_extend DESC, id
LIMIT 10;

-- =====================================================
-- HƯỚNG DẪN SỬ DỤNG
-- =====================================================

-- 1. Admin có thể thay đổi thời gian gia hạn:
-- UPDATE system_settings 
-- SET value = '10', updated_at = NOW() 
-- WHERE key = 'auto_extend_minutes';

-- 2. Bật auto-extend cho product khi tạo mới:
-- INSERT INTO products (..., auto_extend) VALUES (..., true);

-- 3. Tắt/Bật auto-extend cho product đang tồn tại:
-- UPDATE products SET auto_extend = true WHERE id = ?;

-- =====================================================
-- LƯU Ý QUAN TRỌNG
-- =====================================================
-- - Trigger tự động chạy mỗi khi có bid mới
-- - Chỉ gia hạn nếu auto_extend = true
-- - Thời gian mới = MAX(NOW() + t, ends_at cũ)
-- - Admin có thể config thời gian gia hạn qua bảng system_settings
-- =====================================================
