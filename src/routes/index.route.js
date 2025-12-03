const express = require('express');
const router = express.Router();

const authRouter = require('./auth.route');
const productRouter = require('./product.route');
const adminRouter = require('./admin.route');
const productController = require('../controllers/product.controller');

// Route trang chủ
router.get('/', productController.listProducts);

// Gắn các route con
router.use('/auth', authRouter);
router.use('/products', productRouter);
router.use('/admin', adminRouter);

module.exports = router;