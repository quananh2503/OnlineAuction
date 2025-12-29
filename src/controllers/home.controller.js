const productModel = require('../models/product.model');
const bidderRequestModel = require('../models/bidder-request.model');
const db = require('../configs/db');

const FORMATTER = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
});

function formatTimeLeft(iso) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'Đã kết thúc';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ`;
    const days = Math.floor(hours / 24);
    return `${days} ngày`;
}

function mapProductToCard(product) {
    return {
        id: product.id,
        title: product.name,
        image: product.avatar_url,
        currentPrice: FORMATTER.format(product.current_price),
        bidsCount: product.bid_count,
        remainingText: formatTimeLeft(product.ends_at)
    };
}

async function getHome(req, res, next) {
    try {
        const [endingSoon, mostBids, highestPrice] = await Promise.all([
            productModel.getTopEnding(5),
            productModel.getTopBids(5),
            productModel.getTopPrice(5)
        ]);

        // Kiểm tra xem có hiển thị mục yêu cầu nâng cấp seller không
        let showSellerUpgrade = false;
        let sellerRequestStatus = null;

        if (req.isAuthenticated && req.isAuthenticated() && req.user) {
            const userId = req.user.id;
            // Lấy thông tin user
            const userRes = await db.query(`
                SELECT role, seller_total_ratings_count FROM users WHERE id = $1
            `, [userId]);
            
            if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                // Chỉ hiển thị cho BIDDER chưa từng là seller
                const sellerRatingsCount = parseInt(user.seller_total_ratings_count) || 0;
                if (user.role === 'BIDDER' && sellerRatingsCount === 0) {
                    showSellerUpgrade = true;
                    const latestReq = await bidderRequestModel.getLatestByUserId(userId);
                    if (latestReq) {
                        sellerRequestStatus = latestReq.status;
                    }
                }
            }
        }

        res.render('home', {
            endingSoon: endingSoon.map(mapProductToCard),
            mostBids: mostBids.map(mapProductToCard),
            highestPrice: highestPrice.map(mapProductToCard),
            isAuth: req.isAuthenticated && req.isAuthenticated(),
            authUser: req.user,
            showSellerUpgrade,
            sellerRequestStatus
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getHome
};
