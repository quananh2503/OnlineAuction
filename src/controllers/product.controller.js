// Product controller: listing, search, category filter, pagination, sorting
// NOTE: This file uses mock data for demo. Replace the data access with DB queries for production (e.g., full-text search in Postgres).

function sampleProductsExtended() {
    const now = Date.now();
    const make = (i, cat, subcat) => ({
        id: i,
        title: `${cat} - Sản phẩm #${i}`,
        image: `https://picsum.photos/seed/prod${i}/400/300`,
        currentPrice: 100000 + i * 50000,
        bidsCount: Math.floor(Math.random() * 100),
        buyNowPrice: i % 4 === 0 ? (500000 + i * 10000) : null,
        createdAt: new Date(now - (i * 6) * 60 * 1000).toISOString(), // spaced by minutes
        endsAt: new Date(now + (i * 20 + 30) * 60 * 1000).toISOString(),
        category: cat,
        subcategory: subcat,
        seller: { name: `Người bán ${i}`, id: i + 100 }
    });

    const items = [];
    items.push(make(1, 'Điện tử', 'Điện thoại di động'));
    items.push(make(2, 'Điện tử', 'Máy tính xách tay'));
    items.push(make(3, 'Thời trang', 'Giày'));
    items.push(make(4, 'Thời trang', 'Đồng hồ'));
    for (let i = 5; i <= 36; i++) {
        const cat = i % 2 === 0 ? 'Điện tử' : 'Thời trang';
        const sub = (i % 3 === 0) ? (cat === 'Điện tử' ? 'Máy tính xách tay' : 'Giày') : (cat === 'Điện tử' ? 'Điện thoại di động' : 'Đồng hồ');
        items.push(make(i, cat, sub));
    }
    // tweak some values
    items[2].currentPrice = 2000000; items[2].bidsCount = 120;
    items[7].currentPrice = 1500000; items[7].bidsCount = 80;
    items[15].currentPrice = 3500000; items[15].bidsCount = 5;
    return items;
}

function relativeRemaining(iso) {
    const diff = new Date(iso) - Date.now();
    if (diff <= 0) return 'Đã kết thúc';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phút nữa`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ nữa`;
    return `${Math.floor(hours / 24)} ngày nữa`;
}

// Utility: full-text-like filter by q (on title) and category/subcategory
function filterAndSearch(all, q, category) {
    let res = all.slice();
    if (category) {
        const normalized = category.toLowerCase();
        // match category or subcategory slug names
        res = res.filter(p => {
            const catSlug = p.category.toLowerCase().replace(/\s+/g, '-');
            const subSlug = p.subcategory.toLowerCase().replace(/\s+/g, '-');
            return catSlug === normalized || subSlug === normalized || p.category.toLowerCase() === normalized;
        });
    }
    if (q) {
        const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        res = res.filter(p => terms.every(t => p.title.toLowerCase().includes(t) || p.subcategory.toLowerCase().includes(t) || p.category.toLowerCase().includes(t)));
    }
    return res;
}

async function listProducts(req, res, next) {
    try {
        const all = sampleProductsExtended();
        const q = (req.query.q || '').trim();
        const category = req.query.category || '';
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.max(6, parseInt(req.query.limit || '9', 10));
        const sort = req.query.sort || 'end_desc'; // end_desc, price_asc
        const newWithinMinutes = parseInt(req.query.new_minutes || '60', 10);

        let filtered = filterAndSearch(all, q, category);

        // Sorting
        if (sort === 'price_asc') filtered.sort((a, b) => a.currentPrice - b.currentPrice);
        else filtered.sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt)); // end ascending (soon first)

        // Pagination
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const offset = (page - 1) * limit;
        const pageItems = filtered.slice(offset, offset + limit).map(p => ({
            ...p,
            currentPriceFormatted: p.currentPrice.toLocaleString('vi-VN'),
            remainingText: relativeRemaining(p.endsAt),
            isNew: (Date.now() - new Date(p.createdAt)) <= newWithinMinutes * 60 * 1000
        }));

        // categories for sidebar (static for now) - expanded list to match UI
        const categories = [
            { id: 'electronics', name: 'Điện tử' },
            { id: 'electronics-phones', name: 'Điện thoại di động', parent: 'electronics' },
            { id: 'electronics-laptops', name: 'Máy tính xách tay', parent: 'electronics' },
            { id: 'electronics-headphones', name: 'Tai nghe', parent: 'electronics' },
            { id: 'electronics-monitors', name: 'Màn hình', parent: 'electronics' },
            { id: 'electronics-tvs', name: 'Tivi', parent: 'electronics' },
            { id: 'electronics-accessories', name: 'Phụ kiện', parent: 'electronics' },

            { id: 'fashion', name: 'Thời trang' },
            { id: 'fashion-shoes', name: 'Giày', parent: 'fashion' },
            { id: 'fashion-watches', name: 'Đồng hồ', parent: 'fashion' },
            { id: 'fashion-bags', name: 'Túi xách & Phụ kiện', parent: 'fashion' },
            { id: 'fashion-clothing', name: 'Quần áo', parent: 'fashion' },

            { id: 'books', name: 'Nhà sách' },
            { id: 'books-fiction', name: 'Tiểu thuyết', parent: 'books' },
            { id: 'books-education', name: 'Sách học & Giáo trình', parent: 'books' },
            { id: 'books-comics', name: 'Truyện tranh', parent: 'books' },

            { id: 'lifestyle', name: 'Đời sống & Du lịch' },
            { id: 'lifestyle-travel', name: 'Du lịch', parent: 'lifestyle' },
            { id: 'lifestyle-home', name: 'Đời sống & Nội thất', parent: 'lifestyle' },
            { id: 'lifestyle-kitchen', name: 'Đồ gia dụng & Nhà bếp', parent: 'lifestyle' },

            { id: 'auto', name: 'Ô tô & Xe máy' },
            { id: 'auto-cars', name: 'Xe ô tô', parent: 'auto' },
            { id: 'auto-motorcycles', name: 'Xe máy', parent: 'auto' },
            { id: 'auto-parts', name: 'Phụ tùng & Phụ kiện', parent: 'auto' },

            { id: 'beauty', name: 'Sắc đẹp & Sức khỏe' },
            { id: 'beauty-skincare', name: 'Chăm sóc da', parent: 'beauty' },
            { id: 'beauty-makeup', name: 'Trang điểm', parent: 'beauty' }
        ];

        res.render('products/list', {
            products: pageItems,
            total,
            page,
            totalPages,
            limit,
            q,
            category,
            sort,
            categories,
            isAuth: req.isAuthenticated && req.isAuthenticated(),
            authUser: req.user
        });
    } catch (err) {
        next(err);
    }
}

// Search endpoint delegates to listProducts with query
async function search(req, res, next) {
    // reuse listProducts logic but ensure route renders products/list
    return listProducts(req, res, next);
}

module.exports = {
    listProducts,
    search
};
