const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Tất cả routes /account/* đều yêu cầu đăng nhập
router.use(authMiddleware.isAuthenticated);

// Profile
router.get('/profile', authController.getProfile);
router.post('/profile', authController.postProfile);

// Change Password
router.get('/change-password', authController.getChangePassword);
router.post('/change-password', authController.postChangePassword);

// Request Seller
// /account/request-seller"
router.post('/request-seller', (req, res, next) => {
    console.log('🚀 Route /account/request-seller được gọi!');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    next();
}, authController.postRequestSeller);

module.exports = router;
