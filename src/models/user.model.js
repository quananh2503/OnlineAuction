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
        // user là object chứa { email, password, name, address, google_id }
        const sql = `
            INSERT INTO users (email, password, name, address, google_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await db.query(sql, [
            user.email, 
            user.password, 
            user.name, 
            user.address || null,
            user.google_id || null
        ]);
        return result.rows[0];
    },
    async update(user) {
        // user là object chứa { email, password, name, address, google_id }
        const sql = `
            UPDATE users
            set email=$2,name=$3,address=$4,birthday=$5
            where id = $1
            returning *;
        `;
        const result = await db.query(sql, [
            user.id,
            user.email, 
            user.name, 
            user.address ,
            user.birthday
        ]);
        return result.rows[0];
    }
};