const db = require('../src/configs/db');

async function run() {
    try {
        console.log('Adding payment_time_limit column to products table...');
        await db.pool.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS payment_time_limit integer DEFAULT 24;
        `);
        console.log('Success!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

run();
