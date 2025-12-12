const db = require('../src/configs/db');

async function migrate() {
    try {
        console.log('Adding description column to products table...');
        await db.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT');
        console.log('Migration successful!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
