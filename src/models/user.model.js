
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
            INSERT INTO users (email, password, name, address, google_id,otp)
            VALUES ($1, $2, $3, $4, $5,$6)
            RETURNING *
        `;
        const result = await db.query(sql, [
            user.email,
            user.password,
            user.name,
            user.address || null,
            user.google_id || null,
            user.otp
        ]);
        return result.rows[0];
    },
    async update(user) {
        // Chỉ update name, address, birthday - KHÔNG update email
        const sql = `
            UPDATE users
            SET name = $2, address = $3, birthday = $4
            WHERE id = $1
            RETURNING *;
        `;
        const result = await db.query(sql, [
            user.id,
            user.name,
            user.address,
            user.birthday
        ]);
        return result.rows[0];
    },
    async updatePassword(userId, hash) {
        // user là object chứa { email, password, name, address, google_id }
        const sql = `
            UPDATE users
            set password = $2
            where id = $1
            returning *;
        `;
        const result = await db.query(sql, [
            userId,
            hash
        ]);
        return result.rows[0];
    },
    async updateOTP(email, otp) {
        const sql = `
            UPDATE users
            set otp = $2
            where email = $1
            returning *;
        `;
        const result = await db.query(sql, [
            email,
            otp
        ]);
        return result.rows[0];
    },
    async checkOTP(email, otp) {
        const sql = `
            select exists(
                select 1
                from users
                where email = $1 and otp = $2
            )
        `;
        const result = await db.query(sql, [
            email,
            otp
        ]);
        return result.rows[0];
    },
    async active(email) {
        const sql = `
            update users
            set status='ACTIVE'
            where email = $1
            returning *;
        `;
        const result = await db.query(sql, [
            email
        ]);
        return result.rows[0];
    },

    // Update role của user
    async updateRole(userId, role) {
        let sql;
        if (role === 'SELLER') {
            sql = `
                UPDATE users
                SET role = $2, seller_expiration_date = NOW() + INTERVAL '7 days'
                WHERE id = $1
                RETURNING *;
            `;
        } else {
            sql = `
                UPDATE users
                SET role = $2
                WHERE id = $1
                RETURNING *;
            `;
        }
        const result = await db.query(sql, [userId, role]);
        return result.rows[0];
    },

    // Xóa người dùng
    async deleteUser(userId) {
        const sql = `
            DELETE FROM users
            WHERE id = $1
            RETURNING *;
        `;
        const result = await db.query(sql, [userId]);
        return result.rows[0];
    },

    // Reset mật khẩu người dùng - Tạo mật khẩu mới ngẫu nhiên
    async resetPassword(userId, newPassword) {
        const sql = `
            UPDATE users
            SET password = $2
            WHERE id = $1
            RETURNING *;
        `;
        const result = await db.query(sql, [userId, newPassword]);
        return result.rows[0];
    }
};
