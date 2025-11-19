const db = require('../configs/db');

module.exports = {
    // 1. Tìm user bằng email (Dùng cho Đăng nhập & check trùng email)
    async findByEmail(email) {
        const sql = `SELECT * FROM users WHERE email = $1`;
        const result = await db.query(sql, [email]);
        return result.rows[0]; // Trả về user hoặc undefined
    },

    // 2. Tìm user bằng ID (Dùng cho Passport deserialize)
    async findById(id) {
        const sql = `SELECT * FROM users WHERE id = $1`;
        const result = await db.query(sql, [id]);
        return result.rows[0];
    },

    // 3. Thêm user mới (Dùng cho Đăng ký)
    async add(user) {
        // user là object chứa { email, password, full_name }
        const sql = `
            INSERT INTO users (email, password, full_name, role)
            VALUES ($1, $2, $3, 'bidder')
            RETURNING *
        `;
        const result = await db.query(sql, [user.email, user.password, user.full_name]);
        return result.rows[0];
    }
};