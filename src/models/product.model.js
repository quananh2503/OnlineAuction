const db = require('../configs/db');

module.exports = {
    async listAllProducts(){
        const sql = `SELECT * FROM products `;
        const result = await db.query(sql);
        return result.rows
    },
    async getProductById(id){
        const sql = `SELECT * FROM products WHERE id = $1`;
        const result = await db.query(sql,[id]);
        return result.rows[0]
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
    async create(product){
        const sql = `
            INSERT INTO products (name, description, price, image_url)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await db.query(sql, [
            product.name,
            product.description,
            product.price,
            product.image_url
        ]);
        return result.rows[0];
    }
    // // 1. Tìm user bằng email (Dùng cho Đăng nhập & check trùng email)
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