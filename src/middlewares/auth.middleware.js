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
    },

    // Middleware kiểm tra quyền admin
    isAdmin(req, res, next) {
        if (!req.isAuthenticated()) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login');
        }

        // Kiểm tra role admin (giả sử có trường role trong user)
        // TODO: Cập nhật DB users table thêm column 'role'
        if (req.user && req.user.role === 'admin') {
            return next();
        }

        // Không có quyền admin
        res.status(403).render('403', {
            message: 'Bạn không có quyền truy cập trang này!'
        });
    }
};
