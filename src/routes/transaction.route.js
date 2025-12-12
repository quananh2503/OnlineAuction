const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Tất cả routes yêu cầu đăng nhập
router.use(authMiddleware.isAuthenticated);

// Danh sách transactions đã thắng (buyer) - Đang xử lý
router.get('/won', transactionController.listWonTransactions);

// Danh sách transactions đã mua thành công (buyer) - Lịch sử
router.get('/bought', transactionController.listBoughtTransactions);

// Danh sách transactions đã bán (seller)
router.get('/sold', transactionController.listSoldTransactions);

// Chi tiết transaction và completion flow
router.get('/:id', transactionController.getTransactionDetail);

// Actions
router.post('/:id/payment', transactionController.submitPayment);
router.post('/:id/shipping', transactionController.confirmShipping);
router.post('/:id/confirm', transactionController.confirmReceipt);
router.post('/:id/rate', transactionController.submitRating);
router.post('/:id/cancel', transactionController.cancelTransaction);
router.post('/:id/chat', transactionController.sendChat);

module.exports = router;
