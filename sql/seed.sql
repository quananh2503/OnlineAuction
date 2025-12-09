-- ==========================================
-- PHẦN 1: DỮ LIỆU CŨ (ID < 100)
-- ==========================================

-- Users
INSERT INTO users (id, email, name, password, address, role, status)
VALUES
    (1, 'khang@example.com', 'Nguyễn Minh Khang', '$2a$10$ExampleHashUser01', 'HCM', 'SELLER', 'ACTIVE'),
    (2, 'thu@example.com', 'Trần Anh Thư', '$2a$10$ExampleHashUser02', 'HN', 'BIDDER', 'ACTIVE'),
    (3, 'huy@example.com', 'Lê Quốc Huy', '$2a$10$ExampleHashUser03', 'Đà Nẵng', 'BIDDER', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, name, parent_id)
VALUES
    (1, 'Điện tử', NULL),
    (2, 'Thời trang', NULL),
    (3, 'Điện thoại', 1),
    (4, 'Laptop', 1),
    (5, 'Đồng hồ', 2)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (
    id, seller_id, winner_id, category_id, name,
    starts_at, ends_at, starting_price, price_step,
    buy_now_price, avatar_url, current_price, bid_count, status
)
VALUES
    (1, 1, NULL, 3, 'iPhone 15 Pro Max', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 hour', 23000000, 500000, 32000000, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', 27500000, 18, 'ACTIVE'),
    (2, 1, NULL, 4, 'MacBook Pro 16" M3', NOW() - INTERVAL '2 day', NOW() + INTERVAL '1 day', 42000000, 1000000, 55000000, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', 50500000, 22, 'ACTIVE'),
    (3, 1, NULL, 5, 'Rolex Submariner', NOW() - INTERVAL '12 hour', NOW() + INTERVAL '8 hour', 250000000, 2000000, 320000000, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf', 311000000, 9, 'ACTIVE'),
    (4, 1, NULL, 3, 'Samsung Galaxy S24 Ultra', NOW() - INTERVAL '8 hour', NOW() + INTERVAL '6 hour', 21000000, 500000, 29000000, 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5', 24800000, 14, 'ACTIVE'),
    (5, 1, NULL, 5, 'Apple Watch Ultra 2', NOW() - INTERVAL '10 hour', NOW() + INTERVAL '14 hour', 19000000, 300000, 25000000, 'https://images.unsplash.com/photo-1503389152951-9f343605f61e', 21400000, 7, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Descriptions (Old)
INSERT INTO descriptions (product_id, content)
SELECT * FROM (VALUES
    (1, 'Máy fullbox, bảo hành 12 tháng, hỗ trợ trả góp.'),
    (2, 'Phiên bản M3 Pro 36GB RAM, 1TB SSD.'),
    (3, 'Rolex Submariner chính hãng, đầy đủ hộp sổ.'),
    (4, 'Samsung S24 Ultra màu Titanium Grey, 512GB.'),
    (5, 'Apple Watch Ultra 2 pin 36 giờ, dây Alpine Loop.')
) AS v(product_id, content)
WHERE NOT EXISTS (
    SELECT 1 FROM descriptions WHERE product_id = v.product_id
);

-- Images (Old)
INSERT INTO images (product_id, url, type)
SELECT v.product_id, v.url, v.type
FROM (VALUES
    (1, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', 'AVATAR'::image_type),
    (1, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9', 'SECONDARY'::image_type),
    (2, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', 'AVATAR'::image_type),
    (3, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf', 'AVATAR'::image_type),
    (4, 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5', 'AVATAR'::image_type),
    (5, 'https://images.unsplash.com/photo-1503389152951-9f343605f61e', 'AVATAR'::image_type)
) AS v(product_id, url, type)
WHERE NOT EXISTS (
    SELECT 1 FROM images WHERE product_id = v.product_id AND url = v.url
);

-- Bids (Old)
INSERT INTO bids (product_id, bidder_id, price, status)
SELECT v.product_id, v.bidder_id, v.price, v.status
FROM (VALUES
    (1, 2, 25000000, 'ACTIVE'::bid_status),
    (1, 3, 26500000, 'ACTIVE'::bid_status),
    (1, 2, 27500000, 'ACTIVE'::bid_status),
    (2, 2, 48000000, 'ACTIVE'::bid_status),
    (2, 3, 49500000, 'ACTIVE'::bid_status),
    (2, 2, 50500000, 'ACTIVE'::bid_status),
    (3, 2, 298000000, 'ACTIVE'::bid_status),
    (3, 3, 311000000, 'ACTIVE'::bid_status),
    (4, 2, 22800000, 'ACTIVE'::bid_status),
    (4, 3, 24000000, 'ACTIVE'::bid_status),
    (4, 2, 24800000, 'ACTIVE'::bid_status),
    (5, 3, 20500000, 'ACTIVE'::bid_status),
    (5, 2, 21400000, 'ACTIVE'::bid_status)
) AS v(product_id, bidder_id, price, status)
WHERE NOT EXISTS (
    SELECT 1 FROM bids WHERE product_id = v.product_id AND bidder_id = v.bidder_id AND price = v.price
);

-- Comments (Old)
-- Insert parent comments first
INSERT INTO comments (id, product_id, user_id, parent_id, content)
SELECT v.id, v.product_id, v.user_id, v.parent_id, v.content
FROM (VALUES
    (1, 1, 2, NULL::integer, 'Máy còn bảo hành chính hãng không shop?'),
    (3, 3, 3, NULL::integer, 'Có giấy tờ đầy đủ không?')
) AS v(id, product_id, user_id, parent_id, content)
WHERE NOT EXISTS (
    SELECT 1 FROM comments WHERE id = v.id
);

-- Insert child comments
INSERT INTO comments (id, product_id, user_id, parent_id, content)
SELECT v.id, v.product_id, v.user_id, v.parent_id, v.content
FROM (VALUES
    (2, 1, 1, 1, 'Còn bảo hành 11 tháng bạn nhé.')
) AS v(id, product_id, user_id, parent_id, content)
WHERE NOT EXISTS (
    SELECT 1 FROM comments WHERE id = v.id
);

-- Watchlists (Old)
INSERT INTO watchlists (user_id, product_id)
VALUES
    (2, 1),
    (2, 3),
    (3, 2),
    (3, 5)
ON CONFLICT (user_id, product_id) DO NOTHING;


-- ==========================================
-- PHẦN 2: DỮ LIỆU MỚI (ID >= 100)
-- ==========================================

-- 1. Users Mới
INSERT INTO users (id, email, name, password, address, role, status)
VALUES
    (100, 'seller1@example.com', 'Cửa Hàng Công Nghệ', '$2a$10$ExampleHash100', 'TP.HCM', 'SELLER', 'ACTIVE'),
    (101, 'seller2@example.com', 'Thời Trang Cao Cấp', '$2a$10$ExampleHash101', 'Hà Nội', 'SELLER', 'ACTIVE'),
    (102, 'seller3@example.com', 'Nội Thất Xinh', '$2a$10$ExampleHash102', 'Đà Nẵng', 'SELLER', 'ACTIVE'),
    (103, 'seller4@example.com', 'Auto Showroom', '$2a$10$ExampleHash103', 'Cần Thơ', 'SELLER', 'ACTIVE'),
    (104, 'bidder1@example.com', 'Nguyễn Văn Mua', '$2a$10$ExampleHash104', 'Hải Phòng', 'BIDDER', 'ACTIVE'),
    (105, 'bidder2@example.com', 'Trần Thị Sắm', '$2a$10$ExampleHash105', 'Huế', 'BIDDER', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 2. Categories Mới
INSERT INTO categories (id, name, parent_id)
VALUES
    (100, 'Điện tử', NULL),
    (200, 'Thời trang', NULL),
    (300, 'Nội thất', NULL),
    (400, 'Phương tiện', NULL),
    (101, 'Điện thoại', 100),
    (102, 'Laptop', 100),
    (103, 'iPad & Tablet', 100),
    (201, 'Giày dép', 200),
    (202, 'Quần áo', 200),
    (203, 'Trang sức', 200),
    (301, 'Bàn ghế', 300),
    (302, 'Đèn trang trí', 300),
    (401, 'Xe máy', 400),
    (402, 'Xe đạp', 400)
ON CONFLICT (id) DO NOTHING;

-- 3. Products Mới (30 sản phẩm)
INSERT INTO products (
    id, seller_id, category_id, name,
    starts_at, ends_at, starting_price, price_step,
    buy_now_price, avatar_url, current_price, bid_count, status
)
VALUES
    -- ĐIỆN TỬ (Điện thoại - 101)
    (101, 100, 101, 'iPhone 15 Pro Max 256GB Titan', NOW(), NOW() + INTERVAL '2 days', 28000000, 500000, 35000000, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569', 29500000, 3, 'ACTIVE'),
    (102, 100, 101, 'Samsung Galaxy S24 Ultra', NOW(), NOW() + INTERVAL '1 day', 25000000, 500000, 32000000, 'https://images.unsplash.com/photo-1706716364258-123456789abc', 26000000, 2, 'ACTIVE'),
    (103, 100, 101, 'Xiaomi 14 Ultra Photography Kit', NOW(), NOW() + INTERVAL '3 days', 22000000, 200000, 28000000, 'https://images.unsplash.com/photo-1616348436168-de43ad0db179', 22000000, 0, 'ACTIVE'),
    (104, 100, 101, 'Google Pixel 8 Pro', NOW(), NOW() + INTERVAL '5 hours', 18000000, 200000, 24000000, 'https://images.unsplash.com/photo-1696446701796-da61225697cc', 19200000, 6, 'ACTIVE'),
    
    -- ĐIỆN TỬ (Laptop - 102)
    (105, 100, 102, 'MacBook Pro 14 M3 Pro', NOW(), NOW() + INTERVAL '4 days', 45000000, 1000000, 55000000, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', 47000000, 2, 'ACTIVE'),
    (106, 100, 102, 'Dell XPS 15 9530 OLED', NOW(), NOW() + INTERVAL '2 days', 38000000, 500000, 48000000, 'https://images.unsplash.com/photo-1593642632823-8f78536788c6', 38000000, 0, 'ACTIVE'),
    (107, 100, 102, 'ASUS ROG Zephyrus G14', NOW(), NOW() + INTERVAL '12 hours', 32000000, 500000, 40000000, 'https://images.unsplash.com/photo-1636211993589-6226d3a1ce1c', 34500000, 5, 'ACTIVE'),
    
    -- ĐIỆN TỬ (iPad - 103)
    (108, 100, 103, 'iPad Pro 12.9 M2', NOW(), NOW() + INTERVAL '1 day', 24000000, 200000, 30000000, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0', 25200000, 6, 'ACTIVE'),
    (109, 100, 103, 'Samsung Galaxy Tab S9 Ultra', NOW(), NOW() + INTERVAL '3 days', 20000000, 200000, 26000000, 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9', 20000000, 0, 'ACTIVE'),

    -- THỜI TRANG (Giày - 201)
    (110, 101, 201, 'Nike Air Jordan 1 High Chicago', NOW(), NOW() + INTERVAL '6 hours', 8000000, 100000, 15000000, 'https://images.unsplash.com/photo-1552346154-21d32810aba3', 10500000, 25, 'ACTIVE'),
    (111, 101, 201, 'Adidas Yeezy Boost 350 V2', NOW(), NOW() + INTERVAL '2 days', 5000000, 100000, 8000000, 'https://images.unsplash.com/photo-1520256862855-398228c41684', 5500000, 5, 'ACTIVE'),
    (112, 101, 201, 'Giày Tây Oxford Da Bò', NOW(), NOW() + INTERVAL '5 days', 1500000, 50000, 3000000, 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4', 1500000, 0, 'ACTIVE'),

    -- THỜI TRANG (Quần áo - 202)
    (113, 101, 202, 'Áo Khoác Da Thật Biker', NOW(), NOW() + INTERVAL '1 day', 3000000, 100000, 5000000, 'https://images.unsplash.com/photo-1551028919-ac76c9085b67', 3200000, 2, 'ACTIVE'),
    (114, 101, 202, 'Váy Dạ Hội Thiết Kế', NOW(), NOW() + INTERVAL '3 days', 4000000, 200000, 8000000, 'https://images.unsplash.com/photo-1566174053879-31528523f8ae', 4000000, 0, 'ACTIVE'),
    (115, 101, 202, 'Suit Nam Cao Cấp Ý', NOW(), NOW() + INTERVAL '4 days', 6000000, 200000, 12000000, 'https://images.unsplash.com/photo-1594938298603-c8148c4729d7', 6400000, 2, 'ACTIVE'),

    -- THỜI TRANG (Trang sức - 203)
    (116, 101, 203, 'Nhẫn Kim Cương PNJ', NOW(), NOW() + INTERVAL '2 days', 15000000, 500000, 25000000, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e', 16500000, 3, 'ACTIVE'),
    (117, 101, 203, 'Dây Chuyền Vàng 18K', NOW(), NOW() + INTERVAL '1 day', 8000000, 200000, 12000000, 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75', 9000000, 5, 'ACTIVE'),
    (118, 101, 203, 'Đồng Hồ Rolex Datejust Cũ', NOW(), NOW() + INTERVAL '10 hours', 150000000, 2000000, 200000000, 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e', 162000000, 6, 'ACTIVE'),

    -- NỘI THẤT (Bàn ghế - 301)
    (119, 102, 301, 'Sofa Da Bò Nhập Khẩu', NOW(), NOW() + INTERVAL '5 days', 25000000, 500000, 40000000, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc', 25000000, 0, 'ACTIVE'),
    (120, 102, 301, 'Bàn Ăn Gỗ Sồi 6 Ghế', NOW(), NOW() + INTERVAL '3 days', 12000000, 200000, 18000000, 'https://images.unsplash.com/photo-1617806118233-18e1de247200', 12400000, 2, 'ACTIVE'),
    (121, 102, 301, 'Ghế Công Thái Học Herman Miller', NOW(), NOW() + INTERVAL '2 days', 18000000, 500000, 28000000, 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1', 19500000, 3, 'ACTIVE'),

    -- NỘI THẤT (Đèn - 302)
    (122, 102, 302, 'Đèn Chùm Pha Lê Cổ Điển', NOW(), NOW() + INTERVAL '4 days', 5000000, 100000, 9000000, 'https://images.unsplash.com/photo-1543512214-318c77a07232', 5000000, 0, 'ACTIVE'),
    (123, 102, 302, 'Đèn Cây Đứng Bắc Âu', NOW(), NOW() + INTERVAL '2 days', 1500000, 50000, 3000000, 'https://images.unsplash.com/photo-1507473888900-52e1adad5420', 1600000, 2, 'ACTIVE'),

    -- PHƯƠNG TIỆN (Xe máy - 401)
    (124, 103, 401, 'Honda SH 150i 2023 Lướt', NOW(), NOW() + INTERVAL '2 days', 85000000, 500000, 100000000, 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87', 88000000, 6, 'ACTIVE'),
    (125, 103, 401, 'Vespa Sprint S 125', NOW(), NOW() + INTERVAL '3 days', 70000000, 500000, 85000000, 'https://images.unsplash.com/photo-1623053492988-24432125504c', 70000000, 0, 'ACTIVE'),
    (126, 103, 401, 'Yamaha Exciter 155 VVA', NOW(), NOW() + INTERVAL '1 day', 35000000, 200000, 45000000, 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc', 36000000, 5, 'ACTIVE'),

    -- PHƯƠNG TIỆN (Xe đạp - 402)
    (127, 103, 402, 'Xe Đạp Đua Giant TCR', NOW(), NOW() + INTERVAL '4 days', 25000000, 500000, 35000000, 'https://images.unsplash.com/photo-1485965120184-e224f72275e2', 25000000, 0, 'ACTIVE'),
    (128, 103, 402, 'Xe Đạp Địa Hình Trek Marlin', NOW(), NOW() + INTERVAL '2 days', 12000000, 200000, 18000000, 'https://images.unsplash.com/photo-1576435728678-68d0f98b0852', 12800000, 4, 'ACTIVE'),
    (129, 103, 402, 'Xe Đạp Gấp Brompton', NOW(), NOW() + INTERVAL '5 days', 40000000, 500000, 55000000, 'https://images.unsplash.com/photo-1621955964441-c173e01c135b', 41500000, 3, 'ACTIVE'),
    (130, 103, 402, 'Xe Đạp Fixed Gear Cơ Bản', NOW(), NOW() + INTERVAL '1 day', 3000000, 100000, 5000000, 'https://images.unsplash.com/photo-1532298229144-0ec0c57e308e', 3500000, 5, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 4. Descriptions Mới
INSERT INTO descriptions (product_id, content)
SELECT id, 'Sản phẩm chính hãng, còn mới 99%, đầy đủ phụ kiện. Bảo hành 6 tháng tại cửa hàng.'
FROM products WHERE id >= 100 AND NOT EXISTS (SELECT 1 FROM descriptions WHERE product_id = products.id);

-- 5. Images Mới
INSERT INTO images (product_id, url, type)
SELECT id, avatar_url, 'SECONDARY'::image_type
FROM products WHERE id >= 100 AND NOT EXISTS (SELECT 1 FROM images WHERE product_id = products.id AND type = 'SECONDARY'::image_type);

-- 6. Bids Mới
INSERT INTO bids (product_id, bidder_id, price, status)
SELECT v.product_id, v.bidder_id, v.price, v.status
FROM (VALUES
    (101, 104, 28500000, 'ACTIVE'::bid_status),
    (101, 105, 29000000, 'ACTIVE'::bid_status),
    (101, 104, 29500000, 'ACTIVE'::bid_status),
    (104, 105, 18200000, 'ACTIVE'::bid_status),
    (104, 104, 18400000, 'ACTIVE'::bid_status),
    (104, 105, 18600000, 'ACTIVE'::bid_status),
    (104, 104, 18800000, 'ACTIVE'::bid_status),
    (104, 105, 19000000, 'ACTIVE'::bid_status),
    (104, 104, 19200000, 'ACTIVE'::bid_status),
    (110, 104, 8500000, 'ACTIVE'::bid_status),
    (110, 105, 9000000, 'ACTIVE'::bid_status),
    (110, 104, 9500000, 'ACTIVE'::bid_status),
    (110, 105, 10000000, 'ACTIVE'::bid_status),
    (110, 104, 10500000, 'ACTIVE'::bid_status),
    (118, 105, 155000000, 'ACTIVE'::bid_status),
    (118, 104, 160000000, 'ACTIVE'::bid_status),
    (118, 105, 162000000, 'ACTIVE'::bid_status)
) AS v(product_id, bidder_id, price, status)
WHERE NOT EXISTS (
    SELECT 1 FROM bids WHERE product_id = v.product_id AND bidder_id = v.bidder_id AND price = v.price
);
