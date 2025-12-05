const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Set timezone mặc định cho tất cả queries
pool.on('connect', (client) => {
    client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
});

// QUAN TRỌNG: Phải export một object có chứa hàm query
module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(), // Để sử dụng transactions
};
