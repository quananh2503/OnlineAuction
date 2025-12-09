const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Connection pool configuration
    max: 20, // Số kết nối tối đa
    min: 2, // Số kết nối tối thiểu luôn mở
    idleTimeoutMillis: 30000, // Đóng kết nối idle sau 30s
    connectionTimeoutMillis: 10000, // Timeout khi tạo kết nối mới
    maxUses: 7500, // Số lần sử dụng tối đa trước khi đóng kết nối
    allowExitOnIdle: false, // Không cho phép process exit khi idle
});

// Set timezone mặc định cho tất cả queries
pool.on('connect', (client) => {
    client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
});

// Error handling cho pool
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Không throw error, chỉ log để process không crash
});

// QUAN TRỌNG: Phải export một object có chứa hàm query
module.exports = {
    query: async (text, params) => {
        const client = await pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        } finally {
            client.release(); // Luôn release client về pool
        }
    },
    getClient: () => pool.connect(), // Để sử dụng transactions
    pool, // Export pool để dùng cho session store
};
