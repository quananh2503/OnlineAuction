const db = require('../configs/db');

module.exports = {
    // Kiểm tra user đã watchlist product chưa
    async isWatchlisted(userId, productId) {
        const sql = `
            SELECT EXISTS(
                SELECT 1 FROM watchlists
                WHERE user_id = $1 AND product_id = $2
            ) as exists
        `;
        const result = await db.query(sql, [userId, productId]);
        return result.rows[0].exists;
    },

    // Thêm product vào watchlist
    async add(userId, productId) {
        const sql = `
            INSERT INTO watchlists (user_id, product_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, product_id) DO NOTHING
            RETURNING *
        `;
        const result = await db.query(sql, [userId, productId]);
        return result.rows[0];
    },

    // Xóa product khỏi watchlist
    async remove(userId, productId) {
        const sql = `
            DELETE FROM watchlists
            WHERE user_id = $1 AND product_id = $2
            RETURNING *
        `;
        const result = await db.query(sql, [userId, productId]);
        return result.rows[0];
    },

    // Toggle watchlist (thêm nếu chưa có, xóa nếu đã có)
    async toggle(userId, productId) {
        const isWatchlisted = await this.isWatchlisted(userId, productId);
        
        if (isWatchlisted) {
            await this.remove(userId, productId);
            return { action: 'removed', watchlisted: false };
        } else {
            await this.add(userId, productId);
            return { action: 'added', watchlisted: true };
        }
    },

    // Lấy tất cả watchlist của user
    async getUserWatchlist(userId) {
        const sql = `
            SELECT 
                p.id, p.name, p.avatar_url, p.current_price, 
                p.starting_price, p.ends_at, p.status,
                c.name as category_name
            FROM watchlists w
            JOIN products p ON w.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE w.user_id = $1
            ORDER BY w.product_id DESC
        `;
        const result = await db.query(sql, [userId]);
        return result.rows;
    },

    // Đếm số lượng watchlist của user
    async countUserWatchlist(userId) {
        const sql = `
            SELECT COUNT(*) as count
            FROM watchlists
            WHERE user_id = $1
        `;
        const result = await db.query(sql, [userId]);
        return parseInt(result.rows[0].count);
    }
};
