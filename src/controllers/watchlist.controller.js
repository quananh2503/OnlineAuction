const watchlistModel = require('../models/watchlist.model');
const { formatMoney, maskName } = require('../utils/format');
const { formatAbsolute, formatRelativeOrAbsolute } = require('../utils/time');

module.exports = {
    // API: Toggle watchlist (AJAX)
    async toggleWatchlist(req, res) {
        try {
            // Kiểm tra đã đăng nhập chưa
            if (!req.isAuthenticated()) {
                return res.status(401).json({
                    success: false,
                    message: 'Vui lòng đăng nhập để sử dụng tính năng này!'
                });
            }

            const { productId } = req.params;
            const userId = req.user.id;

            // Toggle watchlist
            const result = await watchlistModel.toggle(userId, parseInt(productId));

            // Trả về JSON response
            return res.json({
                success: true,
                action: result.action,
                watchlisted: result.watchlisted,
                message: result.action === 'added'
                    ? 'Đã thêm vào danh sách yêu thích!'
                    : 'Đã xóa khỏi danh sách yêu thích!'
            });

        } catch (error) {
            console.error('Error toggling watchlist:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra, vui lòng thử lại!'
            });
        }
    },

    // Hiển thị danh sách watchlist của user
    async getMyWatchlist(req, res, next) {
        try {
            const userId = req.user.id;
            const keyword = (req.query.q || '').trim();

            const watchlist = await watchlistModel.getUserWatchlist(userId, keyword);

            // Format watchlist giống như product list
            const watchlistFormatted = watchlist.map(p => {
                const currentPrice = Number(p.current_price);
                const startingPrice = Number(p.starting_price);
                const priceStep = Number(p.price_step);
                const bidCount = Number(p.bid_count || 0);
                const suggestedBidValue = (bidCount === 0) ? startingPrice : (currentPrice + priceStep);

                return {
                    id: p.id,
                    name: p.name,
                    avatar_url: p.avatar_url,
                    currentPriceFormatted: formatMoney(p.current_price),
                    buyNowPrice: p.buy_now_price ? formatMoney(p.buy_now_price) : null,
                    bidsCount: p.bid_count || 0,
                    remainingText: formatRelativeOrAbsolute(p.ends_at),
                    createdAt: formatAbsolute(p.starts_at),
                    highestBidder: p.highest_bidder_name ? maskName(p.highest_bidder_name) : 'Chưa có',
                    suggestedBidFormatted: formatMoney(suggestedBidValue),
                    status: p.status,
                    category_name: p.category_name
                };
            });

            res.render('watchlist/my-watchlist', {
                watchlist: watchlistFormatted,
                q: keyword,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error getting watchlist:', error);
            next(error);
        }
    }
};
