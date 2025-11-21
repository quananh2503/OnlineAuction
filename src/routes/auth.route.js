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
    console.log('Login req.body:', req.body);
    passport.authenticate('local', (err, user, info) => {
        console.log('=== PASSPORT AUTHENTICATE ===');
        console.log('err:', err);
        console.log('user:', user);
        console.log('info:', info);
        console.log('============================');
        
        if (err) { return next(err); }
        
        // Nếu lỗi (sai pass, sai email) -> quay lại trang login + thông báo
        if (!user) {
            return res.render('account/login', { 
                error_msg: info.message 
            });
        }
        
        // Nếu OK -> Log In và về trang chủ
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            console.log('✅ Login successful! Session:', req.session);
            return res.redirect('/');
        });
    })(req, res, next);
});

// --- ĐĂNG XUẤT ---
router.post('/logout', authController.postLogout);
router.post('/update',authController.postProfile)

router.get('/profile',authController.getProfile)
router.get('/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);

// Google OAuth - Bước 2: Google redirect về đây sau khi user đồng ý
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
        // Đăng nhập thành công -> Về trang chủ
        res.redirect('/');
    }
);

module.exports = router;