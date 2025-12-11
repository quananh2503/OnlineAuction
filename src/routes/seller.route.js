const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const sellerMiddleware = require('../middlewares/seller.middleware');
const upload = require('../middlewares/upload');

// --- BIDDER REQUEST UPGRADE ---
// Ai cũng có thể request (miễn là đã login)
router.post('/request-upgrade', authMiddleware.isAuthenticated, sellerController.requestUpgrade);

// --- SELLER ROUTES ---
// Tất cả các route dưới đây đều yêu cầu quyền Seller và còn hạn
router.use(authMiddleware.isAuthenticated, sellerMiddleware.requireSeller);

// 1. Đăng sản phẩm
router.get('/products/create', sellerController.getCreateProduct);
router.post('/products', upload.array('images', 10), sellerController.postCreateProduct);

// 2. Bổ sung mô tả
router.post('/products/:id/description', sellerController.appendDescription);

// 3. Chặn bidder
router.post('/products/:productId/block/:bidderId', sellerController.blockBidder);

// 4. Trả lời câu hỏi
router.post('/products/:productId/questions/:questionId/answer', sellerController.answerQuestion);

// 5. Toggle cho phép người chưa có đánh giá
router.post('/products/:id/toggle-unrated', sellerController.toggleAllowUnrated);

// 6. Lấy danh sách sản phẩm
router.get('/products/active', sellerController.getActiveProducts);
router.get('/products/completed', sellerController.getCompletedProducts);

// 9. Quản lý chi tiết sản phẩm
router.get('/products/:id/manage', sellerController.getSellerProductDetail);

// 7. Đánh giá người thắng
router.post('/transactions/rate', sellerController.rateWinner);

// 8. Hủy giao dịch (nếu người thắng không thanh toán)
router.post('/transactions/:id/cancel', sellerController.cancelTransaction);

module.exports = router;
