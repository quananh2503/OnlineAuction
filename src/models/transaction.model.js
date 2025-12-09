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
            INSERT INTO transactions (product_id, buyer_id, seller_id, price)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await db.query(sql, [productId, buyerId, sellerId, price]);
        return result.rows[0];
    }
};
