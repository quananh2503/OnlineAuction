module.exports = {
    // Middleware kiểm tra đã đăng nhập chưa
    isAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next(); // Đã đăng nhập -> Cho đi tiếp
        }
        
        // Chưa đăng nhập -> Lưu URL hiện tại và chuyển về login
        req.session.returnTo = req.originalUrl;
        res.redirect('/auth/login');
    },

    // Middleware kiểm tra chưa đăng nhập (dùng cho trang login/register)
    isNotAuthenticated(req, res, next) {
        if (!req.isAuthenticated()) {
            return next(); // Chưa đăng nhập -> Cho đi tiếp
        }
        
        // Đã đăng nhập rồi -> Về trang chủ
        res.redirect('/');
    }
};
