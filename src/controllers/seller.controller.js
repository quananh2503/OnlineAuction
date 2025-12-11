const sellerService = require('../services/seller.service');
const bidderRequestModel = require('../models/bidder-request.model');
const categoryModel = require('../models/category.model');
const { uploadImagesToSupabase } = require('../utils/uploadHelper');

module.exports = {
    // --- SELLER UPGRADE ---

    // Bidder xin lên Seller
    async requestUpgrade(req, res, next) {
        try {
            const userId = req.user.id;
            const hasPending = await bidderRequestModel.hasPendingRequest(userId);
            if (hasPending) {
                return res.status(400).json({ success: false, message: 'Bạn đã có yêu cầu đang chờ duyệt.' });
            }

            await bidderRequestModel.create(userId);
            res.json({ success: true, message: 'Đã gửi yêu cầu nâng cấp thành công.' });
        } catch (error) {
            next(error);
        }
    },

    // --- PRODUCT MANAGEMENT ---

    // Trang đăng sản phẩm
    async getCreateProduct(req, res, next) {
        try {
            const categories = await categoryModel.getTree();
            res.render('seller/create-product', {
                categories,
                categoriesJson: JSON.stringify(categories),
                isAuth: true,
                authUser: req.user
            });
        } catch (error) {
            next(error);
        }
    },

    // Xử lý đăng sản phẩm
    async postCreateProduct(req, res, next) {
        try {
            const { name, starting_price, price_step, category_id, description, auto_extend, allow_unrated, ends_at } = req.body;

            // Validate basic
            if (!name || !starting_price || !price_step || !category_id || !ends_at) {
                const categories = await categoryModel.getTree();
                return res.render('seller/create-product', {
                    error_msg: 'Vui lòng điền đầy đủ thông tin bắt buộc.',
                    categories,
                    categoriesJson: JSON.stringify(categories),
                    oldInput: req.body,
                    isAuth: true,
                    authUser: req.user
                });
            }

            // Validate ends_at
            if (new Date(ends_at) <= new Date()) {
                const categories = await categoryModel.getTree();
                return res.render('seller/create-product', {
                    error_msg: 'Thời gian kết thúc phải ở tương lai.',
                    categories,
                    categoriesJson: JSON.stringify(categories),
                    oldInput: req.body,
                    isAuth: true,
                    authUser: req.user
                });
            }

            // Handle images
            if (!req.files || req.files.length < 3) {
                const categories = await categoryModel.getTree();
                return res.render('seller/create-product', {
                    error_msg: 'Cần tối thiểu 3 ảnh sản phẩm.',
                    categories,
                    categoriesJson: JSON.stringify(categories),
                    oldInput: req.body,
                    isAuth: true,
                    authUser: req.user
                });
            }

            // Upload to Supabase
            const imageUrls = await uploadImagesToSupabase(req.files);

            const productData = {
                name,
                starting_price: parseInt(starting_price),
                price_step: parseInt(price_step),
                buy_now_price: req.body.buy_now_price ? parseInt(req.body.buy_now_price) : null,
                category_id: parseInt(category_id),
                description,
                avatar_url: imageUrls[0], // First image is avatar
                images: imageUrls.slice(1), // Rest are secondary
                auto_extend: auto_extend === 'true',
                seller_allows_unrated_bidders: allow_unrated === 'true',
                ends_at: ends_at
            };

            await sellerService.createProduct(req.user.id, productData);

            req.flash('success_msg', 'Đăng sản phẩm thành công!');
            res.redirect('/seller/products/active');
        } catch (error) {
            console.error(error);
            res.render('seller/create-product', {
                error_msg: 'Có lỗi xảy ra: ' + error.message,
                categories: await categoryModel.getTree(),
                oldInput: req.body
            });
        }
    },

    // Trang quản lý chi tiết sản phẩm
    async getSellerProductDetail(req, res, next) {
        try {
            const { id } = req.params;
            const result = await sellerService.getSellerProductDetail(id, req.user.id);

            if (!result) {
                return res.redirect('/seller/products/active?error=ProductNotFound');
            }

            res.render('seller/product-detail', {
                product: result.product,
                bids: result.bids,
                questions: result.questions,
                isAuth: true,
                authUser: req.user
            });
        } catch (error) {
            next(error);
        }
    },

    // Append mô tả
    async appendDescription(req, res, next) {
        try {
            const { id } = req.params;
            const { content } = req.body;

            await sellerService.appendDescription(id, content);
            req.flash('success_msg', 'Đã bổ sung mô tả.');
            res.redirect(`/seller/products/${id}/manage`);
        } catch (error) {
            next(error);
        }
    },

    // Block bidder
    async blockBidder(req, res, next) {
        try {
            const { productId, bidderId } = req.params;
            await sellerService.blockBidder(productId, bidderId);
            req.flash('success_msg', 'Đã chặn người dùng này.');
            res.redirect(`/seller/products/${productId}/manage`);
        } catch (error) {
            next(error);
        }
    },

    // Trả lời câu hỏi
    async answerQuestion(req, res, next) {
        try {
            const { productId, questionId } = req.params;
            const { content } = req.body;
            await sellerService.answerQuestion(productId, questionId, req.user.id, content);
            req.flash('success_msg', 'Đã trả lời câu hỏi.');
            res.redirect(`/seller/products/${productId}/manage`);
        } catch (error) {
            next(error);
        }
    },

    // Toggle allow unrated
    async toggleAllowUnrated(req, res, next) {
        try {
            const { id } = req.params;
            await sellerService.toggleAllowUnrated(id, req.user.id);
            req.flash('success_msg', 'Đã cập nhật cấu hình.');
            res.redirect(`/seller/products/${id}/manage`);
        } catch (error) {
            next(error);
        }
    },

    // --- LISTS ---
    async getActiveProducts(req, res, next) {
        try {
            const products = await sellerService.getSellerProducts(req.user.id, 'active');
            res.render('seller/my-products', {
                products,
                active: true,
                isAuth: true,
                authUser: req.user
            });
        } catch (error) {
            next(error);
        }
    },

    async getCompletedProducts(req, res, next) {
        try {
            const products = await sellerService.getSellerProducts(req.user.id, 'completed');
            res.render('seller/my-products', {
                products,
                active: false,
                isAuth: true,
                authUser: req.user
            });
        } catch (error) {
            next(error);
        }
    },

    // --- RATINGS & TRANSACTIONS ---
    async rateWinner(req, res, next) {
        try {
            const { transaction_id, score, content } = req.body;
            if (![1, -1].includes(parseInt(score))) {
                return res.status(400).json({ success: false, message: 'Điểm đánh giá chỉ có thể là +1 hoặc -1.' });
            }
            await sellerService.rateWinner(req.user.id, transaction_id, score, content);
            res.json({ success: true, message: 'Đánh giá thành công.' });
        } catch (error) {
            next(error);
        }
    },

    async cancelTransaction(req, res, next) {
        try {
            const { id } = req.params;
            await sellerService.cancelTransaction(req.user.id, id);
            res.json({ success: true, message: 'Đã hủy giao dịch và đánh giá tiêu cực người mua.' });
        } catch (error) {
            next(error);
        }
    }
};
