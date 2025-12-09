const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Tất cả routes yêu cầu đăng nhập
router.use(authMiddleware.isAuthenticated);

// Danh sách transactions đã thắng (buyer)
router.get('/won', transactionController.listWonTransactions);

// Danh sách transactions đã bán (seller)
router.get('/sold', transactionController.listSoldTransactions);

// Chi tiết transaction và completion flow
router.get('/:id', transactionController.getTransactionDetail);

module.exports = router;
