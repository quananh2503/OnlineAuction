const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Middleware: Chỉ admin mới truy cập được
router.use(authMiddleware.isAdmin);

// Dashboard
router.get('/', adminController.getDashboard);

// Categories Management
router.get('/categories', adminController.listCategories);
router.post('/categories', adminController.createCategory);
router.post('/categories/:id/update', adminController.updateCategory);
router.post('/categories/:id/delete', adminController.deleteCategory);

// Products Management
router.get('/products', adminController.listProducts);
router.post('/products/:id/remove', adminController.removeProduct);

// Users Management
router.get('/users', adminController.listUsers);
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);

// Bidder Requests Management
router.get('/bidder-requests', adminController.listBidderRequests);
router.post('/bidder-requests/:id/approve', adminController.approveBidderRequest);
router.post('/bidder-requests/:id/reject', adminController.rejectBidderRequest);
router.get('/bidder-requests', adminController.postBidderRequest);

module.exports = router;
