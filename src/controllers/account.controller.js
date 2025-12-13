const db = require('../configs/db');
const { formatMoney, maskName } = require('../utils/format');
const { formatAbsolute, formatRelativeOrAbsolute } = require('../utils/time');
const userModel = require('../models/user.model');
const bidderRequestModel = require('../models/bidder-request.model');

module.exports = {
    // 1. Profile Dashboard (Info + Ratings)
    async getProfile(req, res) {
        try {
            const userId = req.user.id;

            // Get user details + ratings summary
            const userRes = await db.query(`
                SELECT * FROM users WHERE id = $1
            `, [userId]);
            const user = userRes.rows[0];

            // Get recent ratings received
            const ratingsRes = await db.query(`
                SELECT r.*, u.name as rater_name, p.name as product_name, p.id as product_id
                FROM ratings r
                JOIN users u ON r.from_user_id = u.id
                JOIN transactions t ON r.transaction_id = t.id
                JOIN products p ON t.product_id = p.id
                WHERE r.to_user_id = $1
                ORDER BY r.created_at DESC
                LIMIT 10
            `, [userId]);

            const ratings = ratingsRes.rows.map(r => ({
                rater: maskName(r.rater_name),
                score: r.score > 0 ? '+1' : '-1',
                isPositive: r.score > 0,
                content: r.content,
                productName: r.product_name,
                productId: r.product_id,
                date: formatAbsolute(r.created_at)
            }));

            // Bidder rating: dùng average_rating đã tính sẵn, hiển thị dạng %
            const bidderRating = {
                stars: user.bidder_average_rating != null ? (user.bidder_average_rating * 100).toFixed(0) + '%' : null,
                total: user.bidder_total_ratings_count || 0,
                ratio: user.bidder_average_rating != null ? (user.bidder_average_rating * 100).toFixed(0) : null
            };

            // Seller rating: dùng average_rating đã tính sẵn, hiển thị dạng %
            const sellerRating = {
                stars: user.seller_average_rating != null ? (user.seller_average_rating * 100).toFixed(0) + '%' : null,
                total: user.seller_total_ratings_count || 0,
                ratio: user.seller_average_rating != null ? (user.seller_average_rating * 100).toFixed(0) : null
            };

            // Check seller request status
            let showSellerRequest = false;
            let sellerRequestStatus = null;

            // Assuming 'role' column exists and stores 'BIDDER', 'SELLER', 'ADMIN'
            // If user is BIDDER, they can request upgrade
            if (user.role === 'BIDDER') {
                showSellerRequest = true;
                const latestReq = await bidderRequestModel.getLatestByUserId(userId);
                if (latestReq) {
                    sellerRequestStatus = latestReq.status;
                }
            }

            res.render('account/profile', {
                user,
                ratings,
                bidderRating,
                sellerRating,
                activeTab: 'profile',
                showSellerRequest,
                sellerRequestStatus
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('500');
        }
    },

    // 2. Update Profile (Existing logic)
    async postProfile(req, res) {
        // ... (Reuse existing logic or import from authController if needed, 
        // but for now let's assume we keep the update logic here or redirect to authController)
        // Since the route was pointing to authController, I should probably keep using authController for update
        // OR move it here. To avoid breaking changes, I will implement it here similar to authController.
        try {
            const { name, email, address, birthday } = req.body;
            const userId = req.user.id;

            await db.query(
                'UPDATE users SET name = $1, email = $2, address = $3, birthday = $4 WHERE id = $5',
                [name, email, address, birthday || null, userId]
            );

            req.flash('success_msg', 'Cập nhật hồ sơ thành công!');
            res.redirect('/account/profile');
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Lỗi cập nhật hồ sơ.');
            res.redirect('/account/profile');
        }
    },

    // 3. Bidding List
    async getBidding(req, res) {
        try {
            const userId = req.user.id;
            // Get products where user has active bids and product is still active
            const { rows } = await db.query(`
                SELECT DISTINCT p.*, 
                       (SELECT price FROM bids WHERE product_id = p.id AND bidder_id = $1 ORDER BY price DESC LIMIT 1) as my_bid
                FROM products p
                JOIN bids b ON p.id = b.product_id
                WHERE b.bidder_id = $1 AND p.status = 'ACTIVE' AND p.ends_at > NOW()
                ORDER BY p.ends_at ASC
            `, [userId]);

            const products = rows.map(p => ({
                id: p.id,
                name: p.name,
                image: p.avatar_url,
                currentPrice: formatMoney(p.current_price),
                myBid: formatMoney(p.my_bid),
                endsRelative: formatRelativeOrAbsolute(p.ends_at),
                isWinning: p.winner_id === userId
            }));

            res.render('account/bidding', {
                products,
                activeTab: 'bidding'
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('500');
        }
    },

    // 4. Won List (Auctions + Buy Now)
    async getWon(req, res) {
        try {
            const userId = req.user.id;
            // Get transactions where user is buyer
            const { rows } = await db.query(`
                SELECT t.id as transaction_id, t.price, t.created_at,
                       p.id as product_id, p.name as product_name, p.avatar_url,
                       s.id as seller_id, s.name as seller_name,
                       r.id as rating_id
                FROM transactions t
                JOIN products p ON t.product_id = p.id
                JOIN users s ON t.seller_id = s.id
                LEFT JOIN ratings r ON t.id = r.transaction_id AND r.from_user_id = $1
                WHERE t.buyer_id = $1
                ORDER BY t.created_at DESC
            `, [userId]);

            const items = rows.map(r => ({
                transactionId: r.transaction_id,
                productId: r.product_id,
                productName: r.product_name,
                image: r.avatar_url,
                price: formatMoney(r.price),
                sellerName: r.seller_name,
                sellerId: r.seller_id,
                date: formatAbsolute(r.created_at),
                isRated: !!r.rating_id
            }));

            res.render('account/won', {
                items,
                activeTab: 'won'
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('500');
        }
    },

    // 5. Submit Rating
    async postRating(req, res) {
        try {
            const { transactionId, score, content } = req.body;
            const userId = req.user.id;
            const scoreInt = parseInt(score, 10);

            if (![-1, 1].includes(scoreInt)) {
                return res.status(400).json({ success: false, message: 'Điểm đánh giá không hợp lệ.' });
            }

            // Verify transaction
            const transRes = await db.query('SELECT * FROM transactions WHERE id = $1 AND buyer_id = $2', [transactionId, userId]);
            if (!transRes.rows.length) {
                return res.status(404).json({ success: false, message: 'Giao dịch không tồn tại.' });
            }
            const transaction = transRes.rows[0];

            // Check if already rated
            const rateCheck = await db.query('SELECT 1 FROM ratings WHERE transaction_id = $1 AND from_user_id = $2', [transactionId, userId]);
            if (rateCheck.rows.length) {
                return res.status(400).json({ success: false, message: 'Bạn đã đánh giá giao dịch này rồi.' });
            }

            // Insert rating
            await db.query(
                'INSERT INTO ratings (transaction_id, from_user_id, to_user_id, score, content) VALUES ($1, $2, $3, $4, $5)',
                [transactionId, userId, transaction.seller_id, scoreInt, content]
            );

            // Update seller stats
            const isPositive = scoreInt === 1;
            await db.query(`
                UPDATE users 
                SET seller_total_ratings_count = seller_total_ratings_count + 1,
                    seller_positive_ratings_count = seller_positive_ratings_count + ${isPositive ? 1 : 0},
                    seller_average_rating = (seller_positive_ratings_count + ${isPositive ? 1 : 0})::float / (seller_total_ratings_count + 1)
                WHERE id = $1
            `, [transaction.seller_id]);

            req.flash('success_msg', 'Đánh giá thành công!');
            res.redirect('/account/won');
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Lỗi khi gửi đánh giá.');
            res.redirect('/account/won');
        }
    }
};
