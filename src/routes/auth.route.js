const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// --- ĐĂNG KÝ ---
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// --- ĐĂNG NHẬP ---
router.get('/login', authController.getLogin);

// Xử lý POST Login (Giao cho Passport lo)
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }

        // Nếu lỗi (sai pass, sai email) -> quay lại trang login + thông báo
        if (!user) {
            return res.render('account/login', {
                layout: 'auth',
                title: 'Đăng nhập',
                error_msg: info.message
            });
        }

        // Nếu OK -> Log In và về trang chủ
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            return res.redirect('/');
        });
    })(req, res, next);
});

// --- ĐĂNG XUẤT ---
router.post('/logout', authController.postLogout);

module.exports = router;