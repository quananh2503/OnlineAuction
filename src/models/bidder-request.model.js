const db = require('../configs/db');

module.exports = {
    // Lấy tất cả pending requests
    async getBidderRequests(status) {
        const sql = `
            SELECT br.id, br.user_id, br.created_at,
                   u.name,u.email ,COALESCE(u.bidder_average_rating, -1) as rating
            FROM bidder_requests br
            JOIN users u ON br.user_id = u.id
            WHERE br.status = $1
        `;
        const result = await db.query(sql, [status]);
        return result.rows;
    },


    // Kiểm tra user đã có pending request chưa
    async hasPendingRequest(userId) {
        const sql = `
            SELECT * FROM bidder_requests
            WHERE user_id = $1 AND status = 'PENDING'
        `;
        const result = await db.query(sql, [userId]);
        return result.rows.length > 0;
    },

    // Tạo request mới
    async create(userId) {
        const sql = `
            INSERT INTO bidder_requests (user_id) 
            VALUES ($1)
            RETURNING *
        `;
        const result = await db.query(sql, [userId]);
        return result.rows[0];
    },

    // Lấy request theo ID
    async findById(id) {
        const sql = `SELECT * FROM bidder_requests WHERE id = $1`;
        const result = await db.query(sql, [id]);
        return result.rows[0];
    },

    // Lấy request mới nhất của user
    async getLatestByUserId(userId) {
        const sql = `
            SELECT status FROM bidder_requests 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const result = await db.query(sql, [userId]);
        return result.rows[0];
    },


    // Approve request
    async approve(requestId, adminId) {
        const sql = `
            UPDATE bidder_requests 
            SET status = 'APPROVED', approved_at = NOW(), approved_by = $2
            WHERE id = $1 AND status = 'PENDING'
            RETURNING user_id
        `;
        const result = await db.query(sql, [requestId, adminId]);
        return result.rows[0];
    },

    // Reject request
    async reject(requestId, rejectReason) {
        const sql = `
            UPDATE bidder_requests 
            SET status = 'REJECTED',rejected_at = NOW(),reject_reason = $2
            WHERE id = $1 AND status = 'PENDING'
            RETURNING *
        `;
        const result = await db.query(sql, [requestId, rejectReason]);
        return result.rows[0];
    },

    // Đếm số pending requests
    async countPending() {
        const sql = `SELECT COUNT(*) FROM bidder_requests WHERE status = 'PENDING'`;
        const result = await db.query(sql);
        return parseInt(result.rows[0].count);
    }
};
