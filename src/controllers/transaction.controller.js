const transactionModel = require('../models/transaction.model');
const { formatMoney } = require('../utils/format');
const { formatAbsolute } = require('../utils/time');

module.exports = {
    // Hiển thị danh sách transactions đã thắng (buyer view) - Chỉ hiện chưa hoàn thành
    async listWonTransactions(req, res, next) {
        try {
            const userId = req.user.id;
            const transactions = await transactionModel.getWonByUser(userId);

            // Filter out completed transactions
            const activeTransactions = transactions.filter(t => t.status !== 'COMPLETED');

            const formattedTransactions = activeTransactions.map(t => ({
                id: t.id,
                productId: t.product_id,
                productName: t.product_name,
                productImage: t.product_image,
                price: formatMoney(t.price),
                priceRaw: t.price,
                sellerName: t.seller_name,
                sellerId: t.seller_id,
                createdAt: formatAbsolute(t.created_at),
                status: t.status || 'PENDING'
            }));

            res.render('transactions/won', {
                transactions: formattedTransactions,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error listing won transactions:', error);
            next(error);
        }
    },

    // Hiển thị danh sách transactions đã bán (seller view)
    async listSoldTransactions(req, res, next) {
        try {
            const userId = req.user.id;
            const transactions = await transactionModel.getSoldByUser(userId);

            const activeTransactions = transactions.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
            const historyTransactions = transactions.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED');

            const formatTx = (t) => ({
                id: t.id,
                productId: t.product_id,
                productName: t.product_name,
                productImage: t.product_image,
                price: formatMoney(t.price),
                priceRaw: t.price,
                buyerName: t.buyer_name,
                buyerId: t.buyer_id,
                createdAt: formatAbsolute(t.created_at),
                status: t.status || 'PENDING',
                isCompleted: t.status === 'COMPLETED',
                isCancelled: t.status === 'CANCELLED'
            });

            res.render('transactions/sold', {
                activeTransactions: activeTransactions.map(formatTx),
                historyTransactions: historyTransactions.map(formatTx),
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error listing sold transactions:', error);
            next(error);
        }
    },

    // Hiển thị chi tiết transaction (completion flow)
    async getTransactionDetail(req, res, next) {
        try {
            const transactionId = req.params.id;
            const userId = req.user.id;

            const transaction = await transactionModel.getById(transactionId);

            if (!transaction) {
                req.flash('error_msg', 'Không tìm thấy giao dịch!');
                return res.redirect('/transactions/won');
            }

            // Kiểm tra user có quyền xem transaction này không
            if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
                req.flash('error_msg', 'Bạn không có quyền xem giao dịch này!');
                return res.redirect('/transactions/won');
            }

            const isBuyer = transaction.buyer_id === userId;
            const isSeller = transaction.seller_id === userId;

            res.render('transactions/detail', {
                transaction: {
                    id: transaction.id,
                    productId: transaction.product_id,
                    productName: transaction.product_name,
                    productImage: transaction.product_image,
                    price: formatMoney(transaction.price),
                    priceRaw: transaction.price,
                    buyerName: transaction.buyer_name,
                    buyerId: transaction.buyer_id,
                    sellerName: transaction.seller_name,
                    sellerId: transaction.seller_id,
                    createdAt: formatAbsolute(transaction.created_at),
                    status: transaction.status || 'PENDING',
                    deliveryAddress: transaction.delivery_address,
                    paymentProof: transaction.payment_proof,
                    shippingProof: transaction.shipping_proof,
                    buyerRating: transaction.buyer_rating,
                    buyerComment: transaction.buyer_comment,
                    sellerRating: transaction.seller_rating,
                    sellerComment: transaction.seller_comment,
                    isCompleted: transaction.status === 'COMPLETED',
                    isCancelled: transaction.status === 'CANCELLED',
                    payment_time_limit: transaction.payment_time_limit
                },
                chats: await transactionModel.getChats(transactionId),
                isBuyer,
                isSeller,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error getting transaction detail:', error);
            next(error);
        }
    },

    // Buyer: Đã mua (Lịch sử thành công)
    async listBoughtTransactions(req, res, next) {
        try {
            const userId = req.user.id;
            const transactions = await transactionModel.getBoughtByUser(userId);

            res.render('transactions/bought', {
                transactions: transactions.map(t => ({
                    ...t,
                    priceFormatted: formatMoney(t.price),
                    dateFormatted: formatAbsolute(t.updated_at)
                })),
                isAuth: true,
                authUser: req.user
            });
        } catch (error) {
            next(error);
        }
    },

    // Step 1: Buyer submit payment
    async submitPayment(req, res, next) {
        try {
            const { id } = req.params;
            const { address } = req.body;
            // Giả sử upload middleware đã xử lý file và trả về req.file
            // Trong thực tế cần upload lên Supabase/Cloudinary
            // Ở đây giả lập url nếu có file, hoặc lấy text input nếu user nhập link
            const proofUrl = req.file ? req.file.path : (req.body.proofUrl || '');

            await transactionModel.updatePayment(id, address, proofUrl);
            req.flash('success_msg', 'Đã gửi thông tin thanh toán.');
            res.redirect(`/transactions/${id}`);
        } catch (error) {
            next(error);
        }
    },

    // Step 2: Seller confirm shipping
    async confirmShipping(req, res, next) {
        try {
            const { id } = req.params;
            const proofUrl = req.body.proofUrl || ''; // Giả lập

            await transactionModel.updateShipping(id, proofUrl);
            req.flash('success_msg', 'Đã xác nhận gửi hàng.');
            res.redirect(`/transactions/${id}`);
        } catch (error) {
            next(error);
        }
    },

    // Step 3: Buyer confirm receipt
    async confirmReceipt(req, res, next) {
        try {
            const { id } = req.params;
            await transactionModel.updateStatus(id, 'COMPLETED');
            req.flash('success_msg', 'Giao dịch hoàn tất!');
            res.redirect(`/transactions/${id}`);
        } catch (error) {
            next(error);
        }
    },

    // Step 4: Rating
    async submitRating(req, res, next) {
        try {
            const { id } = req.params;
            const { rating, comment } = req.body;
            const userId = req.user.id;
            const ratingInt = parseInt(rating);
            
            // Validate rating
            if (![-1, 1].includes(ratingInt)) {
                req.flash('error_msg', 'Điểm đánh giá không hợp lệ.');
                return res.redirect(`/transactions/${id}`);
            }

            // Get transaction
            const transaction = await transactionModel.getById(id);
            if (!transaction) {
                req.flash('error_msg', 'Giao dịch không tồn tại.');
                return res.redirect('/transactions/won');
            }

            // Check permission
            if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
                req.flash('error_msg', 'Bạn không có quyền đánh giá giao dịch này.');
                return res.redirect('/transactions/won');
            }

            const role = transaction.buyer_id === userId ? 'buyer' : 'seller';
            const targetUserId = role === 'buyer' ? transaction.seller_id : transaction.buyer_id;

            // Check if already rated
            const db = require('../configs/db');
            const rateCheck = await db.query(
                'SELECT 1 FROM ratings WHERE transaction_id = $1 AND from_user_id = $2',
                [id, userId]
            );
            if (rateCheck.rows.length > 0) {
                req.flash('error_msg', 'Bạn đã đánh giá giao dịch này rồi.');
                return res.redirect(`/transactions/${id}`);
            }

            // 1. Update rating in transactions table (for compatibility)
            await transactionModel.updateRating(id, userId, role, ratingInt, comment);

            // 2. Insert rating into ratings table
            await db.query(
                'INSERT INTO ratings (transaction_id, from_user_id, to_user_id, score, content) VALUES ($1, $2, $3, $4, $5)',
                [id, userId, targetUserId, ratingInt, comment]
            );

            // 3. Update user stats - Calculate from scratch for accuracy
            const isPositive = ratingInt === 1;
            if (role === 'buyer') {
                // Buyer rating seller -> update seller stats
                // First update counts
                await db.query(`
                    UPDATE users 
                    SET seller_total_ratings_count = seller_total_ratings_count + 1,
                        seller_positive_ratings_count = seller_positive_ratings_count + ${isPositive ? 1 : 0}
                    WHERE id = $1
                `, [targetUserId]);
                
                // Then recalculate average from all ratings (where user is rated as seller)
                const statsRes = await db.query(`
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as positive
                    FROM ratings r
                    JOIN transactions t ON r.transaction_id = t.id
                    WHERE r.to_user_id = $1 AND t.seller_id = $1
                `, [targetUserId]);
                
                const stats = statsRes.rows[0];
                const newAverage = stats.total > 0 ? (parseFloat(stats.positive) / parseFloat(stats.total)) : 0;
                
                await db.query(`
                    UPDATE users 
                    SET seller_average_rating = $1
                    WHERE id = $2
                `, [newAverage, targetUserId]);
            } else {
                // Seller rating buyer -> update buyer stats
                // First update counts
                await db.query(`
                    UPDATE users 
                    SET bidder_total_ratings_count = bidder_total_ratings_count + 1,
                        bidder_positive_ratings_count = bidder_positive_ratings_count + ${isPositive ? 1 : 0}
                    WHERE id = $1
                `, [targetUserId]);
                
                // Then recalculate average from all ratings (where user is rated as buyer)
                const statsRes = await db.query(`
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as positive
                    FROM ratings r
                    JOIN transactions t ON r.transaction_id = t.id
                    WHERE r.to_user_id = $1 AND t.buyer_id = $1
                `, [targetUserId]);
                
                const stats = statsRes.rows[0];
                const newAverage = stats.total > 0 ? (parseFloat(stats.positive) / parseFloat(stats.total)) : 0;
                
                await db.query(`
                    UPDATE users 
                    SET bidder_average_rating = $1
                    WHERE id = $2
                `, [newAverage, targetUserId]);
            }

            req.flash('success_msg', 'Đã gửi đánh giá.');
            res.redirect(`/transactions/${id}`);
        } catch (error) {
            console.error('Error submitting rating:', error);
            req.flash('error_msg', 'Lỗi khi gửi đánh giá.');
            res.redirect(`/transactions/${req.params.id}`);
        }
    },

    // Cancel
    async cancelTransaction(req, res, next) {
        try {
            const { id } = req.params;
            // Chỉ seller được cancel (theo yêu cầu)
            const transaction = await transactionModel.getById(id);
            if (transaction.seller_id !== req.user.id) {
                return res.status(403).send('Unauthorized');
            }

            await transactionModel.updateStatus(id, 'CANCELLED');
            // Auto rate -1 buyer
            await transactionModel.updateRating(id, req.user.id, 'seller', -1, 'Người bán đã hủy giao dịch.');

            req.flash('success_msg', 'Đã hủy giao dịch.');
            res.redirect(`/transactions/${id}`);
        } catch (error) {
            next(error);
        }
    },

    // Chat
    async sendChat(req, res, next) {
        try {
            const { id } = req.params;
            const { content } = req.body;
            await transactionModel.addChat(id, req.user.id, content);
            res.redirect(`/transactions/${id}`);
        } catch (error) {
            next(error);
        }
    }
};
