const express = require('express');
const router = express.Router();

const authRouter = require('./auth.route');

// Route trang chủ
router.get('/', function (req, res) {
    res.render('home'); 
});

// Gắn các route con
router.use('/auth', authRouter); // Đường dẫn sẽ là /auth/login, /auth/register

module.exports = router;