const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Middleware: Chỉ admin mới truy cập được
// TODO: Uncomment khi đã có role admin trong DB
// router.use(authMiddleware.isAdmin);

// Categories Management
router.get('/categories', adminController.listCategories);
router.post('/categories', adminController.createCategory);
router.post('/categories/:id/update', adminController.updateCategory);
router.post('/categories/:id/delete', adminController.deleteCategory);

module.exports = router;
