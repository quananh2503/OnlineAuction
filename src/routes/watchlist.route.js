const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlist.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// API: Toggle watchlist (AJAX endpoint)
router.post('/toggle/:productId', watchlistController.toggleWatchlist);

// Trang xem danh sách watchlist của user
router.get('/my-watchlist', authMiddleware.isAuthenticated, watchlistController.getMyWatchlist);

module.exports = router;
