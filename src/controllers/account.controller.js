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

            // Check seller request/renewal status
            let showSellerRequest = false;
            let showSellerRenewal = false;
            let sellerRequestStatus = null;
            let hasSellerHistory = false;

            // Check if user has seller history (has been seller before)
            hasSellerHistory = (user.seller_total_ratings_count || 0) > 0;

            // If user is BIDDER
            if (user.role === 'BIDDER') {
                // Lấy request status (nếu có)
                const latestReq = await bidderRequestModel.getLatestByUserId(userId);
                if (latestReq) {
                    sellerRequestStatus = latestReq.status;
                }

                if (hasSellerHistory) {
                    // User đã từng là seller -> hiển thị gia hạn
                    showSellerRenewal = true;
                } else {
                    // User chưa từng là seller -> hiển thị yêu cầu
                    showSellerRequest = true;
                }
            }

            res.render('account/profile', {
                user,
                ratings,
                bidderRating,
                sellerRating,
                activeTab: 'profile',
                showSellerRequest,
                showSellerRenewal,
                sellerRequestStatus,
                hasSellerHistory
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('500');
        }
    },

    // 2. Update Profile
    async postProfile(req, res) {
        try {
            const { name, address, birthday } = req.body;
            const userId = req.user.id;

            // Sử dụng userModel.update() - chỉ update name, address, birthday (KHÔNG update email)
            const updatedUser = {
                id: userId,
                name: name || req.user.name,
                address: address || null,
                birthday: birthday || null
            };

            const user = await userModel.update(updatedUser);

            // Format birthday cho input type="date" nếu có
            if (user.birthday) {
                user.birthday = new Date(user.birthday).toISOString().split('T')[0];
            }

            req.flash('success_msg', 'Cập nhật hồ sơ thành công!');
            res.redirect('/account/profile');
        } catch (error) {
            console.error('Error updating profile:', error);
            req.flash('error_msg', 'Lỗi cập nhật hồ sơ: ' + (error.message || 'Vui lòng thử lại.'));
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


    // Gia hạn seller (cho user đã từng là seller) - Tạo request chờ admin duyệt
    async renewSeller(req, res) {
        try {
            const userId = req.user.id;

            // Kiểm tra user có lịch sử seller không
            const userRes = await db.query(`
                SELECT seller_total_ratings_count, role FROM users WHERE id = $1
            `, [userId]);

            const user = userRes.rows[0];
            if (!user) {
                req.flash('error_msg', 'Không tìm thấy thông tin người dùng.');
                return res.redirect('/account/profile');
            }

            // Chỉ cho phép gia hạn nếu:
            // 1. User đã từng là seller (có lịch sử đánh giá)
            // 2. Hiện tại là BIDDER
            if ((user.seller_total_ratings_count || 0) === 0) {
                req.flash('error_msg', 'Bạn chưa từng là seller. Vui lòng yêu cầu nâng cấp qua admin.');
                return res.redirect('/account/profile');
            }

            if (user.role !== 'BIDDER') {
                req.flash('error_msg', 'Bạn đã là seller hoặc không thể gia hạn.');
                return res.redirect('/account/profile');
            }

            // Kiểm tra xem đã có request pending chưa
            const hasPending = await bidderRequestModel.hasPendingRequest(userId);
            if (hasPending) {
                req.flash('error_msg', 'Bạn đã có yêu cầu đang chờ duyệt!');
                return res.redirect('/account/profile');
            }

            // Tạo request mới (giống như yêu cầu nâng cấp)
            await bidderRequestModel.create(userId);

            req.flash('success_msg', 'Đã gửi yêu cầu gia hạn seller! Vui lòng chờ admin duyệt.');
            res.redirect('/account/profile');
        } catch (error) {
            console.error('Error renewing seller:', error);
            req.flash('error_msg', 'Có lỗi xảy ra khi gia hạn seller.');
            res.redirect('/account/profile');
        }
    }
};
