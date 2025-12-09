const transactionModel = require('../models/transaction.model');
const { formatMoney } = require('../utils/format');
const { formatAbsolute } = require('../utils/time');

module.exports = {
    // Hiển thị danh sách transactions đã thắng (buyer view)
    async listWonTransactions(req, res, next) {
        try {
            const userId = req.user.id;
            const transactions = await transactionModel.getWonByUser(userId);

            const formattedTransactions = transactions.map(t => ({
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

            const formattedTransactions = transactions.map(t => ({
                id: t.id,
                productId: t.product_id,
                productName: t.product_name,
                productImage: t.product_image,
                price: formatMoney(t.price),
                priceRaw: t.price,
                buyerName: t.buyer_name,
                buyerId: t.buyer_id,
                createdAt: formatAbsolute(t.created_at),
                status: t.status || 'PENDING'
            }));

            res.render('transactions/sold', {
                transactions: formattedTransactions,
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
                    status: transaction.status || 'PENDING'
                },
                isBuyer,
                isSeller,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error getting transaction detail:', error);
            next(error);
        }
    }
};
