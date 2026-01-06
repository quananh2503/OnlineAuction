const db = require('../configs/db');

module.exports = {
    async listAllProducts() {
        const sql = `
        SELECT 
            products.id, 
            products.seller_id, 
            u.name as seller_name, 
            products.category_id, 
            c.name as category_name, 
            products.name, 
            products.starts_at, 
            products.ends_at, 
            products.starting_price, 
            products.price_step, 
            products.buy_now_price, 
            products.avatar_url, 
            products.current_price, 
            products.status,
            products.bid_count
        FROM products 
        JOIN categories c ON products.category_id = c.id
        JOIN users u ON products.seller_id = u.id
        `;
        const result = await db.query(sql);
        return result.rows
    },


    async getProductById(id) {
        const sql = `
            SELECT p.*, 
                   u.name as seller_name, 
                   c.name as category_name,
                   (SELECT json_agg(url) FROM images WHERE product_id = p.id) as images
            FROM products p
            JOIN users u ON p.seller_id = u.id
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1
        `;
        const result = await db.query(sql, [id]);
        return result.rows[0]
    },

    async getTopEnding(limit = 5) {
        const sql = `
            SELECT * FROM products 
            WHERE status = 'ACTIVE' AND ends_at > NOW() 
            ORDER BY ends_at ASC 
            LIMIT $1
        `;
        const result = await db.query(sql, [limit]);
        return result.rows;
    },

    async getTopBids(limit = 5) {
        const sql = `
            SELECT * FROM products 
            WHERE status = 'ACTIVE' 
            ORDER BY bid_count DESC 
            LIMIT $1
        `;
        const result = await db.query(sql, [limit]);
        return result.rows;
    },

    async getTopPrice(limit = 5) {
        const sql = `
            SELECT * FROM products 
            WHERE status = 'ACTIVE' 
            ORDER BY current_price DESC 
            LIMIT $1
        `;
        const result = await db.query(sql, [limit]);
        return result.rows;
    },
    async filter({ keyword, categoryId, sort, limit, offset, minPrice, maxPrice, status, sellerId }) {
        const params = [];
        let paramIndex = 1;

        let sql = `
            SELECT p.*, 
                   u.name as seller_name, 
                   c.name as category_name,
                   (SELECT name FROM users WHERE id = (
                       SELECT bidder_id FROM bids WHERE product_id = p.id ORDER BY price DESC LIMIT 1
                   )) as highest_bidder_name
            FROM products p
            JOIN users u ON p.seller_id = u.id
            JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;

        // Status filter
        if (status) {
            if (Array.isArray(status)) {
                const placeholders = status.map(() => `$${paramIndex++}`).join(',');
                sql += ` AND p.status IN (${placeholders})`;
                params.push(...status);
            } else {
                sql += ` AND p.status = $${paramIndex++}`;
                params.push(status);
            }
        } else {
            // Default: only active products
            sql += ` AND p.status = 'ACTIVE'`;
        }

        if (keyword) {
            // Full-text search on product name and category name
            sql += ` AND (to_tsvector('simple', p.name || ' ' || c.name) @@ websearch_to_tsquery('simple', $${paramIndex++}))`;
            params.push(keyword);
        }

        if (categoryId) {
            sql += ` AND (p.category_id = $${paramIndex} OR p.category_id IN (SELECT id FROM categories WHERE parent_id = $${paramIndex}))`;
            paramIndex++;
            params.push(categoryId);
        }

        // Price range filter
        if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
            sql += ` AND p.current_price >= $${paramIndex++}`;
            params.push(Number(minPrice));
        }

        if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
            sql += ` AND p.current_price <= $${paramIndex++}`;
            params.push(Number(maxPrice));
        }

        // Seller filter
        if (sellerId) {
            sql += ` AND p.seller_id = $${paramIndex++}`;
            params.push(Number(sellerId));
        }

        // Sorting
        switch (sort) {
            case 'price_asc':
                sql += ` ORDER BY p.current_price ASC`;
                break;
            case 'price_desc':
                sql += ` ORDER BY p.current_price DESC`;
                break;
            case 'end_asc':
                sql += ` ORDER BY p.ends_at ASC`;
                break;
            case 'bids_desc':
                sql += ` ORDER BY p.bid_count DESC`;
                break;
            case 'end_desc':
            default:
                sql += ` ORDER BY p.ends_at DESC`;
                break;
        }

        sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await db.query(sql, params);
        return result.rows;
    },

    async count({ keyword, categoryId, minPrice, maxPrice, status, sellerId }) {
        const params = [];
        let paramIndex = 1;

        let sql = `
            SELECT COUNT(*) as total
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;

        // Status filter
        if (status) {
            if (Array.isArray(status)) {
                const placeholders = status.map(() => `$${paramIndex++}`).join(',');
                sql += ` AND p.status IN (${placeholders})`;
                params.push(...status);
            } else {
                sql += ` AND p.status = $${paramIndex++}`;
                params.push(status);
            }
        } else {
            sql += ` AND p.status = 'ACTIVE'`;
        }

        if (keyword) {
            sql += ` AND (to_tsvector('simple', p.name || ' ' || c.name) @@ websearch_to_tsquery('simple', $${paramIndex++}))`;
            params.push(keyword);
        }

        if (categoryId) {
            sql += ` AND (p.category_id = $${paramIndex} OR p.category_id IN (SELECT id FROM categories WHERE parent_id = $${paramIndex}))`;
            paramIndex++;
            params.push(categoryId);
        }

        if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
            sql += ` AND p.current_price >= $${paramIndex++}`;
            params.push(Number(minPrice));
        }

        if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
            sql += ` AND p.current_price <= $${paramIndex++}`;
            params.push(Number(maxPrice));
        }

        if (sellerId) {
            sql += ` AND p.seller_id = $${paramIndex++}`;
            params.push(Number(sellerId));
        }

        const result = await db.query(sql, params);
        return result.rows[0].total;
    },

    async search(searchTerm) {
        // Full-text search trên cột fts (tsvector)
        // Sử dụng websearch_to_tsquery để tìm kiếm giống Google
        const sql = `
            SELECT * FROM products 
            WHERE fts @@ websearch_to_tsquery('english', $1)
            ORDER BY ts_rank(fts, websearch_to_tsquery('english', $1)) DESC
        `;
        const result = await db.query(sql, [searchTerm]);
        return result.rows;
    },
    async create(productData) {
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // 1. Insert product
            const productSql = `
                INSERT INTO products (
                    seller_id, category_id, name,
                    starts_at, ends_at, 
                    starting_price, price_step, buy_now_price,
                    avatar_url, current_price, status, payment_time_limit
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', $11)
                RETURNING *
            `;

            const productResult = await client.query(productSql, [
                productData.seller_id,
                productData.category_id,
                productData.name,
                productData.starts_at,
                productData.ends_at,
                productData.starting_price,
                productData.price_step,
                productData.buy_now_price || null,
                productData.avatar_url,
                productData.starting_price, // current_price = starting_price
                productData.payment_time_limit
            ]);

            const product = productResult.rows[0];

            // 2. Insert description vào bảng descriptions
            if (productData.description) {
                const descriptionSql = `
                    INSERT INTO descriptions (product_id, content)
                    VALUES ($1, $2)
                `;
                await client.query(descriptionSql, [product.id, productData.description]);
            }

            // 3. Insert avatar image vào bảng images
            const avatarImageSql = `
                INSERT INTO images (product_id, url, type)
                VALUES ($1, $2, 'AVATAR')
            `;
            await client.query(avatarImageSql, [product.id, productData.avatar_url]);

            // 3. Insert description images
            if (productData.image_urls && productData.image_urls.length > 0) {
                const imageSql = `
                    INSERT INTO images (product_id, url, type)
                    VALUES ($1, $2, 'SECONDARY')
                `;

                for (const imageUrl of productData.image_urls) {
                    await client.query(imageSql, [product.id, imageUrl]);
                }
            }

            await client.query('COMMIT');
            return product;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Cập nhật trạng thái sản phẩm
    async updateStatus(productId, status) {
        const sql = `
            UPDATE products 
            SET status = $2 
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(sql, [productId, status]);
        return result.rows[0];
    },

    // Xóa sản phẩm (hard delete)
    async deleteProduct(productId) {
        const sql = `DELETE FROM products WHERE id = $1 RETURNING *`;
        const result = await db.query(sql, [productId]);
        return result.rows[0];
    }
    // // 1. Tìm user bằng email (Dùng cho Đăng nhập & check trưng email)
    // async findByEmail(email) {
    //     const sql = `SELECT * FROM users WHERE email = $1`;
    //     const result = await db.query(sql, [email]);
    //     return result.rows[0]; // Trả về user hoặc undefined
    // },

    // // 2. Tìm user bằng ID (Dùng cho Passport deserialize)
    // async findById(id) {
    //     const sql = `SELECT * FROM users WHERE id = $1`;
    //     const result = await db.query(sql, [id]);
    //     return result.rows[0];
    // },

    // // 3. Thêm user mới (Dùng cho Đăng ký)
    // async add(user) {
    //     // user là object chứa { email, password, name, address, google_id }
    //     const sql = `
    //         INSERT INTO users (email, password, name, address, google_id,otp)
    //         VALUES ($1, $2, $3, $4, $5,$6)
    //         RETURNING *
    //     `;
    //     const result = await db.query(sql, [
    //         user.email, 
    //         user.password, 
    //         user.name, 
    //         user.address || null,
    //         user.google_id || null,
    //         user.otp
    //     ]);
    //     return result.rows[0];
    // },
    // async update(user) {
    //     // user là object chứa { email, password, name, address, google_id }
    //     const sql = `
    //         UPDATE users
    //         set email=$2,name=$3,address=$4,birthday=$5
    //         where id = $1
    //         returning *;
    //     `;
    //     const result = await db.query(sql, [
    //         user.id,
    //         user.email, 
    //         user.name, 
    //         user.address ,
    //         user.birthday
    //     ]);
    //     return result.rows[0];
    // },
    // async updatePassword(userId,hash) {
    //     // user là object chứa { email, password, name, address, google_id }
    //     const sql = `
    //         UPDATE users
    //         set password = $2
    //         where id = $1
    //         returning *;
    //     `;
    //     const result = await db.query(sql, [
    //         userId,
    //         hash
    //     ]);
    //     return result.rows[0];
    // },
    // async updateOTP(email, otp){
    //      const sql = `
    //         UPDATE users
    //         set otp = $2
    //         where email = $1
    //         returning *;
    //     `;
    //     const result = await db.query(sql, [
    //         email,
    //         otp
    //     ]);
    //     return result.rows[0];       
    // },
    // async checkOTP(email, otp){
    //      const sql = `
    //         select exists(
    //             select 1
    //             from users
    //             where email = $1 and otp = $2
    //         )
    //     `;
    //     const result = await db.query(sql, [
    //         email,
    //         otp
    //     ]);
    //     return result.rows[0];       
    // },
    // async active(email){
    //     const sql = `
    //         update users
    //         set status='ACTIVE'
    //         where email = $1
    //         returning *;
    //     `;
    //     const result = await db.query(sql, [
    //         email
    //     ]);
    //     return result.rows[0]; 
    // }
};