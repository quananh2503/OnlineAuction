const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// QUAN TRỌNG: Phải export một object có chứa hàm query
module.exports = {
    query: (text, params) => pool.query(text, params),
};