const db = require('../src/configs/db');

async function run() {
    const email = process.argv[2];
    if (!email) {
        console.error('Vui lòng cung cấp email của user cần set admin.');
        console.error('Ví dụ: node scripts/set_admin.js admin@example.com');
        process.exit(1);
    }

    try {
        const res = await db.query("UPDATE users SET role = 'ADMIN' WHERE email = $1 RETURNING *", [email]);
        if (res.rows.length === 0) {
            console.error(`Không tìm thấy user với email: ${email}`);
        } else {
            console.log(`Đã cập nhật user ${email} thành ADMIN.`);
            console.log(res.rows[0]);
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
