const db = require('../configs/db');

module.exports = {
    // Lấy tất cả transactions của user (cả buyer và seller)
    async getByUserId(userId) {
        const sql = `
            SELECT t.*,
                   p.name as product_name,
                   p.avatar_url as product_image,
                   p.status as product_status,
                   buyer.name as buyer_name,
                   buyer.email as buyer_email,
                   seller.name as seller_name,
                   seller.email as seller_email
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN users buyer ON t.buyer_id = buyer.id
            JOIN users seller ON t.seller_id = seller.id
            WHERE t.buyer_id = $1 OR t.seller_id = $1
            ORDER BY t.created_at DESC
        `;
        const result = await db.query(sql, [userId]);
        return result.rows;
    },

    // Lấy transactions mà user là buyer (người thắng đấu giá)
    async getWonByUser(userId) {
        const sql = `
            SELECT t.*,
                   p.name as product_name,
                   p.avatar_url as product_image,
                   p.status as product_status,
                   p.ends_at as auction_ended_at,
                   seller.name as seller_name,
                   seller.email as seller_email,
                   seller.id as seller_id
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN users seller ON t.seller_id = seller.id
            WHERE t.buyer_id = $1
            ORDER BY t.created_at DESC
        `;
        const result = await db.query(sql, [userId]);
        return result.rows;
    },

    // Lấy transactions mà user là seller (người bán)
    async getSoldByUser(userId) {
        const sql = `
            SELECT t.*,
                   p.name as product_name,
                   p.avatar_url as product_image,
                   p.status as product_status,
                   p.ends_at as auction_ended_at,
                   buyer.name as buyer_name,
                   buyer.email as buyer_email,
                   buyer.id as buyer_id
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN users buyer ON t.buyer_id = buyer.id
            WHERE t.seller_id = $1
            ORDER BY t.created_at DESC
        `;
        const result = await db.query(sql, [userId]);
        return result.rows;
    },

    // Lấy chi tiết transaction theo ID
    async getById(transactionId) {
        const sql = `
            SELECT t.*,
                   p.name as product_name,
                   p.avatar_url as product_image,
                   p.status as product_status,
                   p.ends_at as auction_ended_at,
                   p.payment_time_limit,
                   buyer.name as buyer_name,
                   buyer.email as buyer_email,
                   buyer.id as buyer_id,
                   seller.name as seller_name,
                   seller.email as seller_email,
                   seller.id as seller_id
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN users buyer ON t.buyer_id = buyer.id
            JOIN users seller ON t.seller_id = seller.id
            WHERE t.id = $1
        `;
        const result = await db.query(sql, [transactionId]);
        return result.rows[0];
    },

    // Lấy transaction theo product_id
    async getByProductId(productId) {
        const sql = `
            SELECT t.*,
                   p.name as product_name,
                   p.avatar_url as product_image,
                   p.status as product_status,
                   buyer.name as buyer_name,
                   buyer.email as buyer_email,
                   buyer.id as buyer_id,
                   seller.name as seller_name,
                   seller.email as seller_email,
                   seller.id as seller_id
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN users buyer ON t.buyer_id = buyer.id
            JOIN users seller ON t.seller_id = seller.id
            WHERE t.product_id = $1
            LIMIT 1
        `;
        const result = await db.query(sql, [productId]);
        return result.rows[0];
    },

    // Tạo transaction mới
    async create(productId, buyerId, sellerId, price) {
        const sql = `
            INSERT INTO transactions (product_id, buyer_id, seller_id, price, status)
            VALUES ($1, $2, $3, $4, 'PENDING')
            RETURNING *
        `;
        const result = await db.query(sql, [productId, buyerId, sellerId, price]);
        return result.rows[0];
    },

    // Cập nhật trạng thái
    async updateStatus(id, status) {
        const sql = `UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
        const result = await db.query(sql, [status, id]);
        return result.rows[0];
    },

    // Cập nhật thông tin thanh toán (Buyer)
    async updatePayment(id, address, proofUrl) {
        const sql = `
            UPDATE transactions 
            SET delivery_address = $1, payment_proof = $2, status = 'PAID', updated_at = NOW() 
            WHERE id = $3 
            RETURNING *
        `;
        const result = await db.query(sql, [address, proofUrl, id]);
        return result.rows[0];
    },

    // Cập nhật thông tin vận chuyển (Seller)
    async updateShipping(id, proofUrl) {
        const sql = `
            UPDATE transactions 
            SET shipping_proof = $1, status = 'SHIPPED', updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
        `;
        const result = await db.query(sql, [proofUrl, id]);
        return result.rows[0];
    },

    // Cập nhật đánh giá
    async updateRating(id, userId, role, rating, comment) {
        // role: 'buyer' or 'seller'
        const fieldPrefix = role === 'buyer' ? 'buyer' : 'seller';
        const sql = `
            UPDATE transactions 
            SET ${fieldPrefix}_rating = $1, ${fieldPrefix}_comment = $2, updated_at = NOW() 
            WHERE id = $3 
            RETURNING *
        `;
        const result = await db.query(sql, [rating, comment, id]);
        return result.rows[0];
    },

    // Chat
    async getChats(transactionId) {
        const sql = `
            SELECT c.*, u.name as sender_name 
            FROM chats c
            JOIN users u ON c.sender_id = u.id
            WHERE c.transaction_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await db.query(sql, [transactionId]);
        return result.rows;
    },

    async addChat(transactionId, senderId, content) {
        const sql = `
            INSERT INTO chats (transaction_id, sender_id, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await db.query(sql, [transactionId, senderId, content]);
        return result.rows[0];
    },

    // Lấy transactions đã mua thành công (cho Buyer)
    async getBoughtByUser(userId) {
        const sql = `
            SELECT t.*,
                   p.name as product_name,
                   p.avatar_url as product_image,
                   seller.name as seller_name
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN users seller ON t.seller_id = seller.id
            WHERE t.buyer_id = $1 AND t.status = 'COMPLETED'
            ORDER BY t.updated_at DESC
        `;
        const result = await db.query(sql, [userId]);
        return result.rows;
    }
};
