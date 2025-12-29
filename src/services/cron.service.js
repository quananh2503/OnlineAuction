const db = require('../configs/db');
const transactionModel = require('../models/transaction.model');

const CHECK_INTERVAL = 60 * 1000; // 1 minute

// Kiểm tra và tự động chuyển seller hết hạn về BIDDER
async function checkExpiredSellers() {
    try {
        // Tìm các seller đã hết hạn (seller_expiration_date < NOW() và role = 'SELLER')
        const sql = `
            SELECT id, email, name, seller_expiration_date
            FROM users
            WHERE role = 'SELLER'
            AND seller_expiration_date IS NOT NULL
            AND seller_expiration_date < NOW()
        `;

        const { rows } = await db.query(sql);

        if (rows.length > 0) {
            console.log(`[SellerExpiration] Tìm thấy ${rows.length} seller đã hết hạn. Đang chuyển về BIDDER...`);
        }

        for (const user of rows) {
            try {
                // Chuyển về BIDDER và xóa seller_expiration_date
                await db.query(`
                    UPDATE users
                    SET role = 'BIDDER', seller_expiration_date = NULL
                    WHERE id = $1
                `, [user.id]);

                console.log(`[SellerExpiration] Đã chuyển user ${user.email} (ID: ${user.id}) từ SELLER về BIDDER do hết hạn.`);
            } catch (error) {
                console.error(`[SellerExpiration] Lỗi khi chuyển user ${user.id} về BIDDER:`, error);
            }
        }
    } catch (error) {
        console.error('[SellerExpiration] Lỗi khi kiểm tra seller hết hạn:', error);
    }
}

async function checkOverduePayments() {
    try {
        // Find transactions that are PENDING and overdue
        // We assume transaction created_at is the start of payment window
        // And product.payment_time_limit is in hours
        // Note: payment_time_limit might be null for old products, so we default to 24h if needed, or ignore
        const sql = `
            SELECT t.id, t.buyer_id, t.seller_id, t.created_at, COALESCE(p.payment_time_limit, 24) as payment_time_limit
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE t.status = 'PENDING'
            AND (t.created_at + (COALESCE(p.payment_time_limit, 24) || ' hours')::interval) < NOW()
        `;

        const { rows } = await db.query(sql);

        if (rows.length > 0) {
            console.log(`Found ${rows.length} overdue transactions.`);
        }

        for (const t of rows) {
            console.log(`Transaction ${t.id} is overdue. Cancelling...`);

            // Cancel transaction
            await transactionModel.updateStatus(t.id, 'CANCELLED');

            // Rate buyer -1 (from seller)
            await transactionModel.updateRating(t.id, t.seller_id, 'seller', -1, 'Người thắng không thanh toán đúng hạn');
        }
    } catch (error) {
        console.error('Error checking overdue payments:', error);
    }
}

function start() {
    console.log('Starting cron jobs...');
    
    // Chạy kiểm tra thanh toán quá hạn
    setInterval(checkOverduePayments, CHECK_INTERVAL);
    checkOverduePayments();
    
    // Chạy kiểm tra seller hết hạn (mỗi 1 phút)
    setInterval(checkExpiredSellers, CHECK_INTERVAL);
    // Chạy ngay khi khởi động server
    checkExpiredSellers();
}

module.exports = { start };
