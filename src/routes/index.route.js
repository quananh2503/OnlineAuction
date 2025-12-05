const express = require('express');
const router = express.Router();

const authRouter = require('./auth.route');
const { productRouter, buyerRouter } = require('./product.routes');
const adminRouter = require('./admin.route');
const productController = require('../controllers/product.controller');
const homeController = require('../controllers/home.controller');

// Route trang chủ
router.get('/', homeController.getHome);

// Gắn các route con
router.use('/auth', authRouter);
router.use('/products', productRouter);
router.use('/', buyerRouter);
router.use('/admin', adminRouter);

module.exports = router;