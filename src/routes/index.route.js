const express = require('express');
const router = express.Router();

const authRouter = require('./auth.route');
const homeController = require('../controllers/home.controller');
const productController = require('../controllers/product.controller');

// Route trang chủ
router.get('/', homeController.getHome);

// Route tìm kiếm (sử dụng product controller để hỗ trợ phân trang/sort)
router.get('/search', productController.search);

// Product listing & category
router.get('/products', productController.listProducts);

// Gắn các route con
router.use('/auth', authRouter); // Đường dẫn sẽ là /auth/login, /auth/register

module.exports = router;