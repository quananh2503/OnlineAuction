const db = require('../configs/db');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    if (req.session) {
        req.session.redirectTo = req.originalUrl;
    }
    if (req.flash) {
        req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
    }
    return res.redirect('/auth/login');
}

async function ensureBidderRating(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để thao tác.' });
    }
    try {
        const sql = `
            SELECT rating_positive_count, rating_negative_count
            FROM users
            WHERE id = $1
        `;
        const result = await db.query(sql, [req.user.id]);
        req.bidderRating = result.rows[0] || { rating_positive_count: 0, rating_negative_count: 0 };
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = {
    isAuthenticated,
    ensureBidderRating
};
