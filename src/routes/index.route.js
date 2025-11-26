const express = require('express');
const router = express.Router();

const authRouter = require('./auth.route');
<<<<<<< HEAD
const productRouter = require('./product.route');
const productController= require('../controllers/product.controller')
// Route trang chủ
router.get('/', productController.getAllProduct);
router.get('/search',productController.searchProduct)
router.use('/products',productRouter)
=======
const homeController = require('../controllers/home.controller');
const productController = require('../controllers/product.controller');

// Route trang chủ
router.get('/', homeController.getHome);

// Route tìm kiếm (sử dụng product controller để hỗ trợ phân trang/sort)
router.get('/search', productController.search);

// Product listing & category
router.get('/products', productController.listProducts);
>>>>>>> qa/dev-duy

// // Gắn các route con
router.use('/auth', authRouter); // Đường dẫn sẽ là /auth/login, /auth/register
router.use('/products', productRouter); // Đường dẫn sẽ là /products/feed

module.exports = router;