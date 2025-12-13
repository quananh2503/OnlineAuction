-- =====================================================
-- TẠO BẢNG SETTINGS CHO AUTO-EXTEND (KHÔNG DÙNG TRIGGER)
-- =====================================================

-- Tạo bảng settings cho admin config
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

-- Kiểm tra
SELECT * FROM system_settings;

-- =====================================================
-- HƯỚNG DẪN SỬ DỤNG
-- =====================================================

-- Admin thay đổi thời gian gia hạn:
-- UPDATE system_settings 
-- SET value = '10', updated_at = NOW() 
-- WHERE key = 'auto_extend_minutes';

-- Bật auto-extend cho product:
-- UPDATE products SET auto_extend = true WHERE id = ?;
