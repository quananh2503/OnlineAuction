const watchlistModel = require('../models/watchlist.model');

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
            const watchlist = await watchlistModel.getUserWatchlist(userId);

            res.render('watchlist/my-watchlist', {
                watchlist,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error getting watchlist:', error);
            next(error);
        }
    }
};
