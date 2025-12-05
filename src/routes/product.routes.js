const express = require('express');
const upload = require('../middlewares/upload');
const productController = require('../controllers/product.controller');
const auth = require('../middlewares/auth');

const productRouter = express.Router();
const buyerRouter = express.Router();

// Listing & creation
productRouter.get('/', productController.listProducts);
productRouter.get('/create', auth.isAuthenticated, productController.getCreateProduct);
productRouter.post('/create', auth.isAuthenticated, upload.fields([
    { name: 'avatarImage', maxCount: 1 },
    { name: 'descriptionImages', maxCount: 10 }
]), productController.postCreateProduct);

// Detail & bidder actions
productRouter.get('/:id', productController.detailPage);
productRouter.post('/:productId/bid', auth.isAuthenticated, auth.ensureBidderRating, productController.placeBid);
productRouter.post('/:productId/buy-now', auth.isAuthenticated, auth.ensureBidderRating, productController.buyNow);
productRouter.post('/:productId/questions', auth.isAuthenticated, productController.postQuestion);
productRouter.post('/:productId/questions/:questionId/answer', auth.isAuthenticated, productController.answerQuestion);

// Watchlist
buyerRouter.post('/watchlist/:productId/add', auth.isAuthenticated, productController.addToWatchlist);
buyerRouter.post('/watchlist/:productId/remove', auth.isAuthenticated, productController.removeFromWatchlist);
buyerRouter.get('/me/watchlist', auth.isAuthenticated, productController.watchlistPage);

module.exports = { productRouter, buyerRouter };
