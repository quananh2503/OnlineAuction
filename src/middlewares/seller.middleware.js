const db = require('../configs/db');

module.exports = {
    // Middleware: Kiểm tra user có phải là Seller và còn hạn không
    async requireSeller(req, res, next) {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
        }

        const user = req.user;

        if (user.role !== 'SELLER') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền Seller.' });
        }

        // Kiểm tra thời hạn 7 ngày
        if (user.seller_expiration_date) {
            const now = new Date();
            const expiration = new Date(user.seller_expiration_date);
            if (now > expiration) {
                // Hết hạn -> Hạ cấp về BIDDER (có thể làm tự động ở đây hoặc cronjob)
                // Ở đây ta chỉ chặn quyền và thông báo
                return res.status(403).json({
                    success: false,
                    message: 'Quyền Seller của bạn đã hết hạn. Vui lòng gia hạn.'
                });
            }
        }

        next();
    },

    // Middleware: Chặn mua hàng của chính mình
    async blockSelfPurchase(req, res, next) {
        const productId = req.params.productId || req.params.id;
        const userId = req.user.id;

        try {
            const result = await db.query('SELECT seller_id FROM products WHERE id = $1', [productId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' });
            }

            const product = result.rows[0];
            if (product.seller_id === userId) {
                // Console log như yêu cầu
                console.log(`User ${userId} tried to bid on their own product ${productId}`);
                return res.status(400).json({
                    success: false,
                    message: 'Đây là sản phẩm đấu giá của bạn, không được phép đấu giá.'
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    },

    // Middleware: Kiểm tra xem bidder có bị block ở sản phẩm này không
    async checkBlockedBidder(req, res, next) {
        const productId = req.params.productId || req.params.id;
        const userId = req.user.id;

        try {
            const result = await db.query(
                'SELECT 1 FROM blocked_bidders WHERE product_id = $1 AND bidder_id = $2',
                [productId, userId]
            );

            if (result.rows.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn đã bị người bán chặn đấu giá sản phẩm này.'
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    }
};
