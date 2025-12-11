const db = require('../configs/db');

module.exports = {
    // 1. Đăng sản phẩm
    async createProduct(sellerId, data) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Insert product
            const productSql = `
                INSERT INTO products (
                    seller_id, category_id, name, 
                    starting_price, price_step, buy_now_price, 
                    current_price, avatar_url, 
                    starts_at, ends_at, 
                    status, seller_allows_unrated_bidders
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, 'ACTIVE', $10)
                RETURNING id
            `;
            // Mặc định auto_extend logic có thể xử lý ở cronjob, ở đây ta lưu cơ bản
            // Giả sử data.auto_extend được lưu vào bảng products nếu có cột, hoặc xử lý riêng

            const productRes = await client.query(productSql, [
                sellerId,
                data.category_id,
                data.name,
                data.starting_price,
                data.price_step,
                data.buy_now_price || null,
                data.starting_price, // current_price = starting_price ban đầu
                data.avatar_url,
                data.ends_at, // Use passed ends_at
                data.seller_allows_unrated_bidders
            ]);
            const productId = productRes.rows[0].id;

            // Insert images (ảnh phụ)
            if (data.images && data.images.length > 0) {
                const imageSql = `INSERT INTO images (product_id, url, type) VALUES ($1, $2, 'SECONDARY')`;
                for (const url of data.images) {
                    await client.query(imageSql, [productId, url]);
                }
            }

            // Insert description
            if (data.description) {
                await client.query(
                    `INSERT INTO descriptions (product_id, content, created_at) VALUES ($1, $2, NOW())`,
                    [productId, data.description]
                );
            }

            await client.query('COMMIT');
            return productId;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // 2. Append mô tả
    async appendDescription(productId, content) {
        const sql = `INSERT INTO descriptions (product_id, content, created_at) VALUES ($1, $2, NOW()) RETURNING *`;
        const result = await db.query(sql, [productId, content]);
        return result.rows[0];
    },

    // 3. Block Bidder
    async blockBidder(productId, bidderId) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Thêm vào bảng blocked_bidders
            await client.query(
                `INSERT INTO blocked_bidders (product_id, bidder_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [productId, bidderId]
            );

            // 2. Đánh dấu các bid của user này là REJECTED
            await client.query(
                `UPDATE bids SET status = 'REJECTED' WHERE product_id = $1 AND bidder_id = $2`,
                [productId, bidderId]
            );

            // 3. Kiểm tra xem bidder bị block có đang là winner không
            const productRes = await client.query(`SELECT winner_id FROM products WHERE id = $1 FOR UPDATE`, [productId]);
            const product = productRes.rows[0];

            if (product.winner_id === parseInt(bidderId)) {
                // 4. Tìm người giá cao nhì (mà không bị block và bid status ACTIVE)
                const secondBidRes = await client.query(`
                    SELECT * FROM bids 
                    WHERE product_id = $1 
                      AND status = 'ACTIVE'
                      AND bidder_id != $2
                    ORDER BY price DESC, created_at ASC
                    LIMIT 1
                `, [productId, bidderId]);

                if (secondBidRes.rows.length > 0) {
                    const newWinner = secondBidRes.rows[0];
                    // Cập nhật lại product
                    await client.query(`
                        UPDATE products 
                        SET winner_id = $1, current_price = $2, bid_count = (SELECT COUNT(*) FROM bids WHERE product_id = $3 AND status = 'ACTIVE')
                        WHERE id = $3
                    `, [newWinner.bidder_id, newWinner.price, productId]);
                } else {
                    // Không còn ai khác -> Reset về giá khởi điểm (hoặc giữ nguyên nhưng không có winner)
                    // Ở đây ta reset winner_id về NULL và current_price về starting_price
                    await client.query(`
                        UPDATE products 
                        SET winner_id = NULL, 
                            current_price = starting_price,
                            bid_count = 0
                        WHERE id = $1
                    `, [productId]);
                }
            } else {
                // Cập nhật lại bid_count cho chắc chắn
                await client.query(`
                    UPDATE products 
                    SET bid_count = (SELECT COUNT(*) FROM bids WHERE product_id = $1 AND status = 'ACTIVE')
                    WHERE id = $1
                `, [productId]);
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // 4. Trả lời câu hỏi
    async answerQuestion(productId, questionId, sellerId, content) {
        // Cập nhật câu trả lời
        const sql = `
            UPDATE questions 
            SET answer_content = $1, answered_by = $2, answered_at = NOW()
            WHERE id = $3 AND product_id = $4
            RETURNING *
        `;
        const result = await db.query(sql, [content, sellerId, questionId, productId]);

        // TODO: Gửi email (giả lập)
        // Lấy danh sách email người hỏi và người đấu giá để gửi thông báo

        return result.rows[0];
    },

    // 5. Lấy danh sách sản phẩm của Seller
    async getSellerProducts(sellerId, status) {
        let statusCondition = "status = 'ACTIVE'";
        if (status === 'completed') {
            statusCondition = "status IN ('SOLD', 'ENDED')"; // Giả sử SOLD/ENDED là trạng thái kết thúc
        }

        const sql = `
            SELECT * FROM products 
            WHERE seller_id = $1 AND ${statusCondition}
            ORDER BY starts_at DESC
        `;
        const result = await db.query(sql, [sellerId]);
        return result.rows;
    },

    // 6. Đánh giá người thắng
    async rateWinner(sellerId, transactionId, score, content) {
        // Kiểm tra transaction thuộc về seller này
        const transRes = await db.query(
            `SELECT * FROM transactions WHERE id = $1 AND seller_id = $2`,
            [transactionId, sellerId]
        );
        if (transRes.rows.length === 0) throw new Error('Giao dịch không tồn tại hoặc không thuộc quyền quản lý.');

        const transaction = transRes.rows[0];

        // Insert rating
        const sql = `
            INSERT INTO ratings (transaction_id, from_user_id, to_user_id, score, content)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await db.query(sql, [transactionId, sellerId, transaction.buyer_id, score, content]);
        return result.rows[0];
    },

    // 7. Hủy giao dịch
    async cancelTransaction(sellerId, transactionId) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Kiểm tra transaction
            const transRes = await client.query(
                `SELECT * FROM transactions WHERE id = $1 AND seller_id = $2 FOR UPDATE`,
                [transactionId, sellerId]
            );
            if (transRes.rows.length === 0) throw new Error('Giao dịch không tồn tại.');
            const transaction = transRes.rows[0];

            // Update status transaction
            await client.query(
                `UPDATE transactions SET status = 'CANCELLED' WHERE id = $1`,
                [transactionId]
            );

            // Auto rate -1
            await client.query(
                `INSERT INTO ratings (transaction_id, from_user_id, to_user_id, score, content)
                 VALUES ($1, $2, $3, -1, 'Người thắng không thanh toán')
                 ON CONFLICT DO NOTHING`, // Tránh duplicate nếu đã rate rồi
                [transactionId, sellerId, transaction.buyer_id]
            );

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // 8. Toggle cho phép người chưa có đánh giá
    async toggleAllowUnrated(productId, sellerId) {
        const sql = `
            UPDATE products 
            SET seller_allows_unrated_bidders = NOT seller_allows_unrated_bidders
            WHERE id = $1 AND seller_id = $2
            RETURNING seller_allows_unrated_bidders
        `;
        const result = await db.query(sql, [productId, sellerId]);
        if (result.rows.length === 0) throw new Error('Sản phẩm không tồn tại hoặc không thuộc quyền sở hữu.');
        return result.rows[0].seller_allows_unrated_bidders;
    },

    // 9. Lấy chi tiết sản phẩm cho Seller quản lý (kèm danh sách bid)
    async getSellerProductDetail(productId, sellerId) {
        // Lấy thông tin product
        const productSql = `SELECT * FROM products WHERE id = $1 AND seller_id = $2`;
        const productRes = await db.query(productSql, [productId, sellerId]);
        if (productRes.rows.length === 0) return null;
        const product = productRes.rows[0];

        // Lấy danh sách bids (active)
        const bidsSql = `
            SELECT b.*, u.name as bidder_name, 
                   COALESCE(u.bidder_average_rating, 0) as rating
            FROM bids b
            JOIN users u ON b.bidder_id = u.id
            WHERE b.product_id = $1 AND b.status = 'ACTIVE'
            ORDER BY b.price DESC
        `;
        const bidsRes = await db.query(bidsSql, [productId]);

        // Lấy danh sách câu hỏi
        const questionsSql = `
            SELECT q.*, u.name as asker_name
            FROM questions q
            JOIN users u ON q.user_id = u.id
            WHERE q.product_id = $1
            ORDER BY q.created_at DESC
        `;
        const questionsRes = await db.query(questionsSql, [productId]);

        // Lấy danh sách mô tả bổ sung
        const descSql = `SELECT * FROM descriptions WHERE product_id = $1 ORDER BY created_at ASC`;
        const descRes = await db.query(descSql, [productId]);

        return { product, bids: bidsRes.rows, questions: questionsRes.rows, descriptions: descRes.rows };
    }
};
