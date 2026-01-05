const db = require('../configs/db');
const { maskName } = require('../utils/format');
const { formatAbsolute } = require('../utils/time');

module.exports = {
    /**
     * GET /users/:id/ratings
     * Hiển thị trang đánh giá của user (bidder hoặc seller)
     */
    async getUserRatings(req, res, next) {
        try {
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId)) {
                return res.status(404).render('404');
            }

            // Lấy thông tin user
            const userRes = await db.query(`
                SELECT id, name, role, 
                       seller_average_rating, seller_total_ratings_count,
                       bidder_average_rating, bidder_total_ratings_count
                FROM users 
                WHERE id = $1
            `, [userId]);

            if (!userRes.rows.length) {
                return res.status(404).render('404');
            }

            const user = userRes.rows[0];

            // Lấy danh sách đánh giá nhận được
            const ratingsRes = await db.query(`
                SELECT r.*, 
                       u.name as rater_name, 
                       u.role as rating_role,
                       p.name as product_name, 
                       p.id as product_id
                FROM ratings r
                JOIN users u ON r.from_user_id = u.id
                JOIN transactions t ON r.transaction_id = t.id
                JOIN products p ON t.product_id = p.id
                WHERE r.to_user_id = $1
                ORDER BY r.created_at DESC
            `, [userId]);

            const ratings = ratingsRes.rows.map(r => ({
                rater: maskName(r.rater_name),
                score: r.score > 0 ? '+1' : '-1',
                isPositive: r.score > 0,
                content: r.content || 'Không có nhận xét',
                productName: r.product_name,
                productId: r.product_id,
                role: r.rating_role, // SELLER hoặc BIDDER
                date: formatAbsolute(r.created_at)
            }));

            // Tính rating summary
            const sellerRating = {
                stars: user.seller_average_rating != null
                    ? (user.seller_average_rating * 100).toFixed(0) + '%'
                    : 'N/A',
                total: user.seller_total_ratings_count || 0,
                ratio: user.seller_average_rating != null
                    ? (user.seller_average_rating * 100).toFixed(0)
                    : 0
            };

            const bidderRating = {
                stars: user.bidder_average_rating != null
                    ? (user.bidder_average_rating * 100).toFixed(0) + '%'
                    : 'N/A',
                total: user.bidder_total_ratings_count || 0,
                ratio: user.bidder_average_rating != null
                    ? (user.bidder_average_rating * 100).toFixed(0)
                    : 0
            };

            // Phân loại đánh giá theo vai trò
            const sellerRatings = ratings.filter(r => r.role === 'SELLER');
            const bidderRatings = ratings.filter(r => r.role === 'BIDDER');

            res.render('users/ratings', {
                targetUser: {
                    id: user.id,
                    name: user.name,
                    role: user.role
                },
                sellerRating,
                bidderRating,
                sellerRatings,
                bidderRatings,
                ratings,
                isAuth: req.isAuthenticated && req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error getting user ratings:', error);
            next(error);
        }
    }
};
