const path = require('path');

// For demo purposes we generate mock product data.
// In a real app, replace these with DB queries.
function sampleProducts() {
    const now = Date.now();
    const make = (i) => ({
        id: i,
        title: `Sản phẩm mẫu #${i}`,
        image: `https://picsum.photos/seed/auction${i}/400/300`,
        currentPrice: (100000 + i * 25000).toLocaleString('vi-VN'),
        bidsCount: Math.floor(Math.random() * 50),
        endsAt: new Date(now + (i * 10 + 5) * 60 * 1000).toISOString() // staggered end times
    });

    const list = [];
    for (let i = 1; i <= 12; i++) list.push(make(i));
    // tweak some products to have higher prices/bids
    list[2].currentPrice = (2000000).toLocaleString('vi-VN');
    list[2].bidsCount = 120;
    list[5].currentPrice = (1500000).toLocaleString('vi-VN');
    list[5].bidsCount = 80;
    list[8].currentPrice = (3500000).toLocaleString('vi-VN');
    list[8].bidsCount = 5;
    return list;
}

function remainingTextFrom(isoDate) {
    const diff = new Date(isoDate) - Date.now();
    if (diff <= 0) return 'Đã kết thúc';
    const mins = Math.floor(diff / (60 * 1000));
    if (mins < 60) return `${mins} phút nữa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ nữa`;
    const days = Math.floor(hours / 24);
    return `${days} ngày nữa`;
}

// Exported helpers as requested
async function getTopEndingSoon() {
    const all = sampleProducts();
    // ascending by endsAt
    const sorted = all.slice().sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));
    return sorted.slice(0, 5).map(p => ({ ...p, remainingText: remainingTextFrom(p.endsAt) }));
}

async function getTopMostBids() {
    const all = sampleProducts();
    const sorted = all.slice().sort((a, b) => b.bidsCount - a.bidsCount);
    return sorted.slice(0, 5).map(p => ({ ...p, remainingText: remainingTextFrom(p.endsAt) }));
}

async function getTopHighestPrice() {
    const all = sampleProducts();
    // currentPrice stored as formatted string; convert back for sorting
    const sorted = all.slice().sort((a, b) => {
        const pa = Number(String(a.currentPrice).replace(/\D/g, ''));
        const pb = Number(String(b.currentPrice).replace(/\D/g, ''));
        return pb - pa;
    });
    return sorted.slice(0, 5).map(p => ({ ...p, remainingText: remainingTextFrom(p.endsAt) }));
}

// Controller: render home
async function getHome(req, res, next) {
    try {
        const [endingSoon, mostBids, highestPrice] = await Promise.all([
            getTopEndingSoon(),
            getTopMostBids(),
            getTopHighestPrice()
        ]);

        res.render('home', {
            endingSoon,
            mostBids,
            highestPrice,
            isAuth: req.isAuthenticated && req.isAuthenticated(),
            authUser: req.user,
            query: ''
        });
    } catch (err) {
        next(err);
    }
}

// Search handler (GET /search?q=...)
async function search(req, res, next) {
    try {
        const q = (req.query.q || '').trim();
        const all = sampleProducts();
        const filtered = q ? all.filter(p => p.title.toLowerCase().includes(q.toLowerCase())) : [];
        const searchResults = filtered.map(p => ({ ...p, remainingText: remainingTextFrom(p.endsAt) }));

        // Also render the three sections so layout remains consistent
        const [endingSoon, mostBids, highestPrice] = await Promise.all([
            getTopEndingSoon(), getTopMostBids(), getTopHighestPrice()
        ]);

        res.render('home', {
            endingSoon,
            mostBids,
            highestPrice,
            searchResults,
            query: q,
            isAuth: req.isAuthenticated && req.isAuthenticated(),
            authUser: req.user
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getHome,
    search,
    getTopEndingSoon,
    getTopMostBids,
    getTopHighestPrice
};
