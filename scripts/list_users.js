const db = require('../src/configs/db');

async function run() {
    try {
        const res = await db.query('SELECT id, email, role, name FROM users ORDER BY id');
        console.table(res.rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
