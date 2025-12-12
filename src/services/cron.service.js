const db = require('../configs/db');
const transactionModel = require('../models/transaction.model');

const CHECK_INTERVAL = 60 * 1000; // 1 minute

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
    setInterval(checkOverduePayments, CHECK_INTERVAL);
    // Run immediately on start
    checkOverduePayments();
}

module.exports = { start };
