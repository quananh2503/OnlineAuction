const productModel = require('../models/product.model');

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

        res.render('home', {
            endingSoon: endingSoon.map(mapProductToCard),
            mostBids: mostBids.map(mapProductToCard),
            highestPrice: highestPrice.map(mapProductToCard),
            isAuth: req.isAuthenticated && req.isAuthenticated(),
            authUser: req.user
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getHome
};
