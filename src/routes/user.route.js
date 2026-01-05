const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// Xem đánh giá của user (bidder hoặc seller)
router.get('/:id/ratings', userController.getUserRatings);

module.exports = router;
