const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// // --- ĐĂNG KÝ ---
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// // --- ĐĂNG NHẬP ---
router.get('/login', authController.getLogin);

// Xử lý POST Login (Giao cho Passport lo)
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }

        // Nếu lỗi (sai pass, sai email) -> quay lại trang login + thông báo
        if (!user) {
<<<<<<< HEAD
            // Kiểm tra nếu cần verify OTP
            if (info.needVerify) {
                return res.redirect(`/auth/verify-otp?email=${encodeURIComponent(info.email)}`);
            }
            return res.render('account/login', { 
                error_msg: info.message 
            });
        }
        
        // Nếu OK -> Log In và về trang cũ hoặc trang chủ
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            console.log('✅ Login successful! Session:', req.session);
            
            // Lấy URL đã lưu hoặc về trang chủ
            const returnTo = req.session.returnTo || '/';
            delete req.session.returnTo; // Xóa sau khi dùng
            return res.redirect(returnTo);
=======
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
>>>>>>> qa/dev-duy
        });
    })(req, res, next);
});

// --- ĐĂNG XUẤT ---
router.post('/logout', authController.postLogout);
<<<<<<< HEAD
router.post('/update', authMiddleware.isAuthenticated, authController.postProfile)

router.get('/profile', authMiddleware.isAuthenticated, authController.getProfile)
router.get('/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);
router.get('/change-password', authMiddleware.isAuthenticated, authController.getChangePassword)
router.post('/change-password', authMiddleware.isAuthenticated, authController.postChangePassword)
router.post('/verify-otp',authController.postVerifyOTP)
router.get('/verify-otp',authController.getVerifyOTP)
router.post('/resend-otp',authController.resendOTP)

// Google OAuth - Bước 2: Google redirect về đây sau khi user đồng ý
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
        // Đăng nhập thành công -> Về trang chủ
        res.redirect('/');
    }
);
=======
>>>>>>> qa/dev-duy


module.exports = router;