const db = require('../configs/db');
const { sendAuctionWonNotification, sendAuctionEndedNoWinnerNotification } = require('./email.service');
const { formatMoney } = require('../utils/format');

async function checkExpiredAuctions() {
    try {
        // Find active products that have ended
        const { rows: expiredProducts } = await db.query(`
            SELECT p.*, u.email as seller_email, w.email as winner_email, w.name as winner_name
            FROM products p
            JOIN users u ON p.seller_id = u.id
            LEFT JOIN users w ON p.winner_id = w.id
            WHERE p.status = 'ACTIVE' AND p.ends_at <= NOW()
        `);

        if (expiredProducts.length === 0) return;

        console.log(`[AuctionService] Found ${expiredProducts.length} expired auctions.`);

        for (const product of expiredProducts) {
            const client = await db.getClient();
            try {
                await client.query('BEGIN');

                // Double check status inside transaction
                const checkRes = await client.query('SELECT status FROM products WHERE id = $1 FOR UPDATE', [product.id]);
                if (checkRes.rows[0].status !== 'ACTIVE') {
                    await client.query('ROLLBACK');
                    continue;
                }

                if (product.winner_id) {
                    // Has winner -> SOLD
                    await client.query("UPDATE products SET status = 'SOLD' WHERE id = $1", [product.id]);

                    // Create transaction
                    await client.query(
                        "INSERT INTO transactions (product_id, buyer_id, seller_id, price, status) VALUES ($1, $2, $3, $4, 'PENDING')",
                        [product.id, product.winner_id, product.seller_id, product.current_price]
                    );
                } else {
                    // No winner -> EXPIRED (no bids)
                    await client.query("UPDATE products SET status = 'EXPIRED' WHERE id = $1", [product.id]);
                }

                await client.query('COMMIT');

                if (product.winner_id) {
                    const productUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/products/${product.id}`;
                    sendAuctionWonNotification({
                        sellerEmail: product.seller_email,
                        winnerEmail: product.winner_email,
                        productName: product.name,
                        priceFormatted: formatMoney(product.current_price),
                        productUrl
                    }).catch(err => console.error('[AuctionService] Email error:', err));
                } else {
                    const productUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/products/${product.id}`;
                    sendAuctionEndedNoWinnerNotification({
                        sellerEmail: product.seller_email,
                        productName: product.name,
                        productUrl
                    }).catch(err => console.error('[AuctionService] Email error:', err));
                }

            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`[AuctionService] Error processing product ${product.id}:`, err);
            } finally {
                client.release();
            }
        }
    } catch (error) {
        console.error('[AuctionService] Error checking expired auctions:', error);
    }
}

module.exports = {
    checkExpiredAuctions
};
