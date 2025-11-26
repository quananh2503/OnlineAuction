const express = require('express');
const router = express.Router();

const authRouter = require('./auth.route');
const productRouter = require('./product.route');
const productController= require('../controllers/product.controller')
// Route trang chủ
router.get('/', productController.getAllProduct);
router.get('/search',productController.searchProduct)
router.use('/products',productRouter)

// // Gắn các route con
// router.use('/auth', authRouter); // Đường dẫn sẽ là /auth/login, /auth/register
// router.use('/products', productRouter); // Đường dẫn sẽ là /products/feed

module.exports = router;