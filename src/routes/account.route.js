const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const accountController = require('../controllers/account.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Tất cả routes /account/* đều yêu cầu đăng nhập
router.use(authMiddleware.isAuthenticated);

// Profile Dashboard
router.get('/profile', accountController.getProfile);
router.post('/profile', accountController.postProfile);

// Bidding List
router.get('/bidding', accountController.getBidding);

// Won List & Ratings
router.get('/won', accountController.getWon);
router.post('/rate', accountController.postRating);

// Change Password
router.get('/change-password', authController.getChangePassword);
router.post('/change-password', authController.postChangePassword);

// Request Seller
router.post('/request-seller', authController.postRequestSeller);

module.exports = router;
