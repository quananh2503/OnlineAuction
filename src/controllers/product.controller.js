/**
 * Product & bidder features controller
 * Env requirements: DATABASE_URL, SUPABASE_URL, SUPABASE_KEY, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, APP_BASE_URL
 */

const categoriesModel = require('../models/category.model');
const productModel = require('../models/product.model');
const db = require('../configs/db');
const { supabase } = require('../utils/supabaseClient');
const { formatMoney, maskName } = require('../utils/format');
const { formatAbsolute, formatRelativeOrAbsolute } = require('../utils/time');
const {
    sendQuestionNotification,
    sendAnswerNotification,
    sendBuyNowNotification
} = require('../services/email.service');

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const SELF_BID_COOLDOWN_SECONDS = 5;

async function safeQuery(text, params) {
    try {
        return await db.query(text, params);
    } catch (err) {
        console.warn(`Query failed: ${text.substring(0, 50)}...`, err.message);
        return { rows: [], rowCount: 0 };
    }
}

function wantsJson(req) {
    return Boolean(
        req.xhr ||
        req.headers['x-requested-with'] === 'XMLHttpRequest' ||
        (req.headers.accept && req.headers.accept.includes('application/json'))
    );
}

function respondWithFallback(req, res, targetUrl, payload, status = 200) {
    if (wantsJson(req)) {
        return res.status(status).json(payload);
    }
    if (payload.success) {
        return res.redirect(targetUrl);
    }
    const joinSymbol = targetUrl.includes('?') ? '&' : '?';
    return res.redirect(`${targetUrl}${joinSymbol}error=${encodeURIComponent(payload.message || 'Có lỗi xảy ra')}`);
}

function buildPagination(page, totalPages, query) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        const params = new URLSearchParams({ ...query, page: i.toString() });
        pages.push({ value: i, isActive: i === page, url: `/products?${params.toString()}` });
    }
    return pages;
}

async function fetchWatchlistIds(userId) {
    if (!userId) return new Set();
    const { rows } = await db.query('SELECT product_id FROM watchlists WHERE user_id = $1', [userId]);
    return new Set(rows.map(r => Number(r.product_id)));
}

function mapListProduct(product, watchlisted) {
    const currentPrice = Number(product.current_price);
    const startingPrice = Number(product.starting_price);
    const priceStep = Number(product.price_step);
    const bidCount = Number(product.bid_count || 0);

    // Logic giá gợi ý: Nếu chưa có ai đặt (bidCount=0) -> Giá khởi điểm. Ngược lại -> Giá hiện tại + Bước giá
    const suggestedBidValue = (bidCount === 0) ? startingPrice : (currentPrice + priceStep);

    return {
        id: product.id,
        title: product.name,
        image: product.avatar_url,
        currentPriceFormatted: formatMoney(product.current_price),
        buyNowPrice: product.buy_now_price ? formatMoney(product.buy_now_price) : null,
        bidsCount: product.bid_count,
        remainingText: formatRelativeOrAbsolute(product.ends_at),
        createdAt: formatAbsolute(product.starts_at),
        seller: { name: product.seller_name },
        highestBidder: product.highest_bidder_name ? maskName(product.highest_bidder_name) : 'Chưa có',
        isNew: (Date.now() - new Date(product.starts_at).getTime()) <= (60 * 60 * 1000),
        watchlisted,
        suggestedBidFormatted: formatMoney(suggestedBidValue)
    };
}

async function loadProductDetail(productId, currentUserId) {
    const productSql = `
        SELECT p.*, c.name AS category_name,
               s.name AS seller_name, s.email AS seller_email,
               s.seller_average_rating,
               s.seller_total_ratings_count,
               w.name AS highest_bidder_name,
               w.bidder_average_rating,
               w.bidder_total_ratings_count
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN users s ON p.seller_id = s.id
        LEFT JOIN users w ON p.winner_id = w.id
        WHERE p.id = $1
    `;

    const [productRes, imagesRes, descRes, bidsRes, questionsRes, relatedRes, watchRes] = await Promise.all([
        db.query(productSql, [productId]),
        safeQuery(`SELECT url, type FROM images WHERE product_id = $1 ORDER BY (type = 'AVATAR') DESC, id ASC`, [productId]),
        safeQuery(`SELECT content, created_at FROM descriptions WHERE product_id = $1 ORDER BY created_at ASC`, [productId]),
        safeQuery(`
            SELECT b.id, b.price, b.created_at, b.bidder_id, u.name
            FROM bids b
            JOIN users u ON b.bidder_id = u.id
            WHERE product_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [productId]),
        safeQuery(`
            SELECT q.*, u.name AS asker_name, u.email AS asker_email
            FROM questions q
            JOIN users u ON q.user_id = u.id
            WHERE q.product_id = $1
            ORDER BY q.created_at ASC
        `, [productId]),
        db.query(`
            SELECT p.id, p.name, p.avatar_url, p.current_price, p.ends_at
            FROM products p
            WHERE p.category_id = (SELECT category_id FROM products WHERE id = $1)
              AND p.id <> $1
              AND p.status = 'ACTIVE'
            ORDER BY p.ends_at ASC
            LIMIT 5
        `, [productId]),
        currentUserId ? safeQuery('SELECT 1 FROM watchlists WHERE user_id = $1 AND product_id = $2', [currentUserId, productId]) : Promise.resolve({ rowCount: 0 })
    ]);

    if (!productRes.rows.length) {
        return null;
    }

    const product = productRes.rows[0];

    // Seller rating: dùng average_rating đã tính sẵn, hiển thị dạng %
    const sellerRating = {
        stars: product.seller_average_rating != null ? (product.seller_average_rating * 100).toFixed(0) + '%' : 'N/A',
        total: product.seller_total_ratings_count || 0,
        ratio: product.seller_average_rating != null ? (product.seller_average_rating * 100).toFixed(0) : 0
    };

    // Bidder rating: dùng average_rating đã tính sẵn, hiển thị dạng %
    const bidderRating = {
        stars: product.bidder_average_rating != null ? (product.bidder_average_rating * 100).toFixed(0) + '%' : 'N/A',
        total: product.bidder_total_ratings_count || 0,
        ratio: product.bidder_average_rating != null ? (product.bidder_average_rating * 100).toFixed(0) : 0
    };

    const gallery = imagesRes.rows.length ? imagesRes.rows.map((img) => img.url) : [product.avatar_url];

    let description = product.description;
    let updates = descRes.rows;

    // Backward compatibility: If product.description is missing, use the first entry from descriptions table
    if (!description && updates.length > 0) {
        description = updates[0].content;
        updates = updates.slice(1);
    }

    if (!description) {
        description = 'Chưa có mô tả chi tiết.';
    }

    if (updates.length > 0) {
        updates.forEach(desc => {
            description += `<div class="mt-3 border-top pt-2">
                <p class="fw-bold mb-1 text-primary"><i class="fas fa-pen me-1"></i> Cập nhật ${formatAbsolute(desc.created_at)}</p>
                <div>${desc.content}</div>
            </div>`;
        });
    }

    const showRelative = (new Date(product.ends_at).getTime() - Date.now()) <= (3 * 24 * 60 * 60 * 1000);

    const currentPrice = Number(product.current_price);
    const startingPrice = Number(product.starting_price);
    const priceStep = Number(product.price_step);
    const bidCount = Number(product.bid_count || 0);

    // Logic giá gợi ý: Nếu chưa có ai đặt (bidCount=0) -> Giá khởi điểm. Ngược lại -> Giá hiện tại + Bước giá
    const suggestedBidValue = (bidCount === 0) ? startingPrice : (currentPrice + priceStep);

    return {
        product: {
            id: product.id,
            name: product.name,
            avatarUrl: product.avatar_url,
            gallery,
            currentPriceFormatted: formatMoney(product.current_price),
            startingPriceFormatted: formatMoney(product.starting_price),
            currentPriceValue: product.current_price,
            buyNowPriceValue: product.buy_now_price,
            buyNowPriceFormatted: product.buy_now_price ? formatMoney(product.buy_now_price) : null,
            description,
            categoryName: product.category_name,
            postedAt: formatAbsolute(product.starts_at),
            postedAtRaw: product.starts_at,
            endsAt: formatAbsolute(product.ends_at),
            endsAtRaw: product.ends_at,
            endsRelative: formatRelativeOrAbsolute(product.ends_at),
            showRelative,
            bidCount: product.bid_count,
            priceStep: formatMoney(product.price_step),
            priceStepRaw: product.price_step,
            suggestedBidValue,
            suggestedBidFormatted: formatMoney(suggestedBidValue),
            status: product.status,
            sellerId: product.seller_id,
            winnerId: product.winner_id,
            sellerEmail: product.seller_email,
            seller: {
                id: product.seller_id,
                name: product.seller_name,
                ratingStars: sellerRating.stars,
                ratingTotal: sellerRating.total,
                ratingRatio: sellerRating.ratio,
                ratingUrl: `/users/${product.seller_id}/ratings`
            },
            highestBidder: product.highest_bidder_name ? {
                id: product.winner_id,
                nameMasked: maskName(product.highest_bidder_name),
                nameFull: product.highest_bidder_name,
                ratingStars: bidderRating.stars,
                ratingTotal: bidderRating.total
            } : null,
            sellerAllowsUnrated: product.seller_allows_unrated_bidders
        },
        bidHistory: bidsRes.rows.map(b => ({
            id: b.id,
            bidderId: b.bidder_id,
            time: formatAbsolute(b.created_at),
            bidderMasked: maskName(b.name),
            bidderFull: b.name,
            priceFormatted: formatMoney(b.price)
        })),
        questions: questionsRes.rows.map(q => ({
            id: q.id,
            content: q.content,
            createdAt: formatAbsolute(q.created_at),
            askerName: q.asker_name,
            answerContent: q.answer_content,
            answeredAt: q.answered_at ? formatAbsolute(q.answered_at) : null
        })),
        relatedProducts: relatedRes.rows.map(r => ({
            id: r.id,
            name: r.name,
            image: r.avatar_url,
            priceFormatted: formatMoney(r.current_price),
            endsText: formatRelativeOrAbsolute(r.ends_at)
        })),
        watchlisted: !!watchRes.rowCount
    };
}

async function listProducts(req, res, next) {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.max(6, parseInt(req.query.limit || '6', 10));
        const offset = (page - 1) * limit;
        const keyword = (req.query.q || '').trim();
        const categoryId = req.query.category;
        const sort = req.query.sort || 'end_desc';

        const [products, totalProducts, categories, watchlistIds] = await Promise.all([
            productModel.filter({ keyword, categoryId, sort, limit, offset }),
            productModel.count({ keyword, categoryId }),
            categoriesModel.getTree(),
            fetchWatchlistIds(req.user?.id)
        ]);

        const totalPages = Math.max(1, Math.ceil(totalProducts / limit));
        const productsFormatted = products.map(p => mapListProduct(p, watchlistIds.has(p.id)));

        res.render('products/list', {
            products: productsFormatted,
            total: totalProducts,
            page,
            totalPages,
            pages: buildPagination(page, totalPages, { q: keyword, category: categoryId || '', sort }),
            hasPrevious: page > 1,
            hasNext: page < totalPages,
            prevUrl: `/products?page=${page - 1}&q=${keyword}&category=${categoryId || ''}&sort=${sort}`,
            nextUrl: `/products?page=${page + 1}&q=${keyword}&category=${categoryId || ''}&sort=${sort}`,
            q: keyword,
            category: categoryId,
            sort,
            categories,
            isAuth: req.isAuthenticated && req.isAuthenticated(),
            authUser: req.user
        });
    } catch (error) {
        next(error);
    }
}

async function detailPage(req, res, next) {
    try {
        const productId = req.params.id;
        const detail = await loadProductDetail(productId, req.user?.id);
        if (!detail) {
            return res.status(404).render('404');
        }

        const isAuth = req.isAuthenticated && req.isAuthenticated();
        const isSeller = isAuth && req.user.id === detail.product.sellerId;
        const now = Date.now();
        const ended = now >= new Date(detail.product.endsAtRaw).getTime() || detail.product.status !== 'ACTIVE';

        // Phân quyền hiển thị highestBidder
        let highestBidderDisplay = detail.product.highestBidder;
        if (highestBidderDisplay) {
            if (isSeller) {
                // Người bán thấy tên đầy đủ và link đánh giá
                highestBidderDisplay = {
                    ...highestBidderDisplay,
                    name: highestBidderDisplay.nameFull,
                    ratingUrl: `/users/${highestBidderDisplay.id}/ratings`
                };
            } else {
                // Người khác chỉ thấy tên đã mask, không có link
                highestBidderDisplay = {
                    ...highestBidderDisplay,
                    name: highestBidderDisplay.nameMasked,
                    ratingUrl: null
                };
            }
        }

        // Phân quyền hiển thị bidHistory
        let bidHistoryDisplay = detail.bidHistory.map(b => {
            if (isSeller) {
                // Seller thấy tên đầy đủ + link đánh giá
                return {
                    ...b,
                    bidder: b.bidderFull,
                    ratingUrl: `/users/${b.bidderId}/ratings`
                };
            } else {
                // User khác chỉ thấy tên masked, không có link
                return {
                    ...b,
                    bidder: b.bidderMasked,
                    ratingUrl: null
                };
            }
        });

        res.render('products/detail', {
            product: {
                ...detail.product,
                highestBidder: highestBidderDisplay,
                isSeller,
                canBid: isAuth && !isSeller && !ended,
                canBuyNow: isAuth && !isSeller && !ended && !!detail.product.buyNowPriceValue,
                watchlisted: detail.watchlisted,
                endsDisplay: detail.product.showRelative ? detail.product.endsRelative : detail.product.endsAt
            },
            bidHistory: bidHistoryDisplay,
            questions: detail.questions,
            relatedProducts: detail.relatedProducts,
            isAuth,
            authUser: req.user
        });
    } catch (error) {
        next(error);
    }
}

async function getCreateProduct(req, res, next) {
    try {
        const categories = await categoriesModel.getSubCategories();
        res.render('products/create_product', {
            categories,
            isAuth: true,
            authUser: req.user
        });
    } catch (error) {
        next(error);
    }
}

async function uploadImagesToSupabase(files) {
    const bucketName = 'productimages';
    const results = [];
    for (const file of files) {
        const sanitized = file.originalname
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitized}`;
        const { error } = await supabase.storage.from(bucketName).upload(fileName, file.buffer, {
            contentType: file.mimetype
        });
        if (error) throw error;
        const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        results.push(data.publicUrl);
    }
    return results;
}

async function postCreateProduct(req, res, next) {
    try {
        const {
            name,
            category_id,
            description,
            starts_at,
            ends_at,
            starting_price,
            price_step,
            buy_now_price,
            payment_time_limit
        } = req.body;

        const categories = await categoriesModel.getSubCategories();

        if (!req.files || !req.files.avatarImage || !req.files.descriptionImages) {
            return res.status(400).render('products/create_product', { categories, error: 'Vui lòng chọn ảnh đại diện và ít nhất 3 ảnh mô tả.' });
        }

        if (req.files.descriptionImages.length < 3) {
            return res.status(400).render('products/create_product', { categories, error: 'Cần tối thiểu 3 ảnh mô tả.' });
        }

        const [avatarUrl] = await uploadImagesToSupabase(req.files.avatarImage);
        const descriptionUrls = await uploadImagesToSupabase(req.files.descriptionImages);

        const productData = {
            seller_id: req.user.id,
            category_id: Number(category_id),
            name: name.trim(),
            description: description?.trim() || null,
            starts_at,
            ends_at,
            starting_price: parseFloat(starting_price),
            price_step: parseFloat(price_step),
            buy_now_price: buy_now_price ? parseFloat(buy_now_price) : null,
            payment_time_limit: parseInt(payment_time_limit) || 24,
            avatar_url: avatarUrl,
            image_urls: descriptionUrls
        };

        await productModel.create(productData);
        return res.redirect('/products');
    } catch (error) {
        next(error);
    }
}

async function ensureBidEligibility(product, bidderRating, bidderId) {
    // Check if blocked
    const blockedRes = await db.query('SELECT 1 FROM blocked_bidders WHERE product_id = $1 AND bidder_id = $2', [product.id, bidderId]);
    if (blockedRes.rows.length > 0) {
        return { ok: false, message: 'Bạn đã bị người bán chặn khỏi phiên đấu giá này.' };
    }

    if (product.seller_id === bidderId) {
        return { ok: false, message: 'Bạn không thể đấu giá sản phẩm của chính mình.' };
    }
    if (product.winner_id === bidderId) {
        return { ok: false, message: 'Bạn đang là người đấu giá cao nhất không thể tiếp tục đấu giá vui lòng đợi khi có người đấu giá cao hơn' };
    }
    if (product.status !== 'ACTIVE' || new Date(product.ends_at).getTime() <= Date.now()) {
        return { ok: false, message: 'Phiên đấu giá đã kết thúc.' };
    }

    const positive = bidderRating?.rating_positive_count || 0;
    const negative = bidderRating?.rating_negative_count || 0;
    const totalRatings = positive + negative;
    if (totalRatings > 0) {
        const ratio = positive / totalRatings;
        if (ratio < 0.8) {
            return { ok: false, message: 'Điểm đánh giá của bạn chưa đạt 80% nên không thể đặt giá.' };
        }
    } else if (!product.seller_allows_unrated_bidders) {
        console.log(`[BID REJECTED] Seller ${product.seller_id} does not allow unrated bidder ${bidderId} to bid on product ${product.id}`);
        return { ok: false, message: 'Người bán không cho phép người dùng chưa có đánh giá tham gia.' };
    }

    return { ok: true };
}

async function placeBid(req, res, next) {
    const productId = req.params.productId;
    const bidAmount = parseFloat(req.body.amount);
    if (Number.isNaN(bidAmount)) {
        return res.status(400).json({ success: false, message: 'Giá không hợp lệ.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT p.*, u.email AS seller_email FROM products p JOIN users u ON p.seller_id = u.id WHERE p.id = $1 FOR UPDATE', [productId]);
        if (!productRes.rows.length) {
            await client.query('ROLLBACK');
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: 'Sản phẩm không tồn tại.' }, 404);
        }
        const product = productRes.rows[0];
        const eligibility = await ensureBidEligibility(product, req.bidderRating, req.user.id);
        if (!eligibility.ok) {
            await client.query('ROLLBACK');
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: eligibility.message }, 400);
        }

        const currentPrice = Number(product.current_price);
        const startingPrice = Number(product.starting_price);
        const priceStep = Number(product.price_step);
        const bidCount = Number(product.bid_count || 0);

        // Logic giá gợi ý: Nếu chưa có ai đặt (bidCount=0) -> Giá khởi điểm. Ngược lại -> Giá hiện tại + Bước giá
        const suggested = (bidCount === 0) ? startingPrice : (currentPrice + priceStep);

        if (bidAmount < suggested) {
            await client.query('ROLLBACK');
            return respondWithFallback(req, res, `/products/${productId}`, {
                success: false,
                message: `Giá đặt phải >= ${formatMoney(suggested)}`,
                suggested
            }, 400);
        }

        const lastBidRes = await client.query(
            'SELECT created_at FROM bids WHERE product_id = $1 AND bidder_id = $2 ORDER BY created_at DESC LIMIT 1',
            [productId, req.user.id]
        );
        if (lastBidRes.rows.length) {
            const lastBidTime = new Date(lastBidRes.rows[0].created_at).getTime();
            if (Date.now() - lastBidTime < SELF_BID_COOLDOWN_SECONDS * 1000) {
                await client.query('ROLLBACK');
                return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít giây.' }, 429);
            }
        }

        // Get previous highest bidder for notification
        const prevBidRes = await client.query(`
            SELECT u.email 
            FROM bids b
            JOIN users u ON b.bidder_id = u.id
            WHERE b.product_id = $1 AND b.status = 'ACTIVE'
            ORDER BY b.price DESC
            LIMIT 1
        `, [productId]);
        const prevBidderEmail = prevBidRes.rows.length > 0 ? prevBidRes.rows[0].email : null;

        await client.query(
            `INSERT INTO bids (product_id, bidder_id, price, status) VALUES ($1, $2, $3, 'ACTIVE')`,
            [productId, req.user.id, bidAmount]
        );

        // Auto-extend logic: Nếu product có auto_extend = true, gia hạn thời gian
        if (product.auto_extend) {
            // Lấy cấu hình thời gian gia hạn (mặc định 5 phút)
            const extendMinutesRes = await client.query(
                `SELECT value FROM system_settings WHERE key = 'auto_extend_minutes'`
            );
            const extendMinutes = extendMinutesRes.rows.length > 0
                ? parseInt(extendMinutesRes.rows[0].value)
                : 5;

            // Cập nhật ends_at = MAX(NOW() + extendMinutes, ends_at hiện tại)
            await client.query(
                `UPDATE products 
                 SET current_price = $1, 
                     bid_count = bid_count + 1, 
                     winner_id = $2,
                     ends_at = GREATEST(NOW() + INTERVAL '${extendMinutes} minutes', ends_at)
                 WHERE id = $3`,
                [bidAmount, req.user.id, productId]
            );
        } else {
            // Không auto-extend, chỉ cập nhật giá và winner
            await client.query(
                `UPDATE products SET current_price = $1, bid_count = bid_count + 1, winner_id = $2 WHERE id = $3`,
                [bidAmount, req.user.id, productId]
            );
        }

        await client.query('COMMIT');

        // Send Email Notification
        const { sendBidSuccessEmail } = require('../services/email.service');
        sendBidSuccessEmail({
            sellerEmail: product.seller_email,
            bidderEmail: req.user.email,
            prevBidderEmail: (prevBidderEmail && prevBidderEmail !== req.user.email) ? prevBidderEmail : null,
            productName: product.name,
            price: formatMoney(bidAmount),
            time: formatAbsolute(new Date()),
            productUrl: `${BASE_URL}/products/${productId}`,
            bidderName: req.user.name
        }).catch(err => console.error('Email error:', err));

        // TODO: Emit realtime event via SSE/socket here.
        return respondWithFallback(req, res, `/products/${productId}`, {
            success: true,
            newPrice: bidAmount,
            newPriceFormatted: formatMoney(bidAmount)
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
}

async function buyNow(req, res, next) {
    const productId = req.params.productId;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT p.*, u.email AS seller_email FROM products p JOIN users u ON p.seller_id = u.id WHERE p.id = $1 FOR UPDATE', [productId]);
        if (!productRes.rows.length) {
            await client.query('ROLLBACK');
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: 'Sản phẩm không tồn tại.' }, 404);
        }
        const product = productRes.rows[0];
        if (!product.buy_now_price) {
            await client.query('ROLLBACK');
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: 'Sản phẩm không hỗ trợ mua ngay.' }, 400);
        }
        const eligibility = await ensureBidEligibility(product, req.bidderRating, req.user.id);
        if (!eligibility.ok) {
            await client.query('ROLLBACK');
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: eligibility.message }, 400);
        }

        await client.query('UPDATE products SET status = $1, current_price = $2, winner_id = $3 WHERE id = $4', [
            'SOLD',
            product.buy_now_price,
            req.user.id,
            productId
        ]);

        // Insert transaction and get ID
        const transRes = await client.query(
            'INSERT INTO transactions (product_id, buyer_id, seller_id, price, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [productId, req.user.id, product.seller_id, product.buy_now_price, 'PENDING']
        );
        const transactionId = transRes.rows[0].id;

        await client.query('COMMIT');
        const { sendBuyNowNotification } = require('../services/email.service');
        await sendBuyNowNotification({
            sellerEmail: product.seller_email,
            buyerEmail: req.user.email,
            productName: product.name,
            price: formatMoney(product.buy_now_price),
            productUrl: `${BASE_URL}/products/${productId}`
        });

        // Redirect to transaction detail for payment
        return respondWithFallback(req, res, `/transactions/${transactionId}`, { success: true, redirect: `/transactions/${transactionId}` });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
}

async function addToWatchlist(req, res, next) {
    try {
        const productId = req.params.productId;
        await db.query(
            'INSERT INTO watchlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.user.id, productId]
        );
        if (wantsJson(req)) {
            return res.json({ success: true });
        }
        return res.redirect(req.get('referer') || `/products/${productId}`);
    } catch (error) {
        next(error);
    }
}

async function removeFromWatchlist(req, res, next) {
    try {
        const productId = req.params.productId;
        await db.query('DELETE FROM watchlists WHERE user_id = $1 AND product_id = $2', [req.user.id, productId]);
        if (wantsJson(req)) {
            return res.json({ success: true });
        }
        return res.redirect(req.get('referer') || '/me/watchlist');
    } catch (error) {
        next(error);
    }
}

async function watchlistPage(req, res, next) {
    try {
        const { rows } = await db.query(`
            SELECT w.product_id, p.name, p.avatar_url, p.current_price, p.buy_now_price,
                   p.ends_at, c.name AS category_name
            FROM watchlists w
            JOIN products p ON w.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE w.user_id = $1
            ORDER BY p.ends_at ASC
        `, [req.user.id]);

        const items = rows.map(r => ({
            id: r.product_id,
            name: r.name,
            category: r.category_name,
            image: r.avatar_url,
            currentPriceFormatted: formatMoney(r.current_price),
            buyNowPriceFormatted: r.buy_now_price ? formatMoney(r.buy_now_price) : null,
            endsText: formatRelativeOrAbsolute(r.ends_at)
        }));

        res.render('users/watchlist', {
            products: items,
            isAuth: true,
            authUser: req.user
        });
    } catch (error) {
        next(error);
    }
}

async function postQuestion(req, res, next) {
    try {
        const productId = req.params.productId;
        const content = (req.body.content || '').trim();
        if (!content) {
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: 'Nội dung câu hỏi không được để trống.' }, 400);
        }

        const { rows } = await db.query('INSERT INTO questions (product_id, user_id, content) VALUES ($1, $2, $3) RETURNING id', [
            productId,
            req.user.id,
            content
        ]);

        const detail = await loadProductDetail(productId, req.user.id);
        const { sendNewQuestionEmail } = require('../services/email.service');
        await sendNewQuestionEmail({
            sellerEmail: detail?.product?.sellerEmail,
            sellerName: detail?.product?.seller?.name,
            askerName: req.user.name,
            productName: detail?.product?.name,
            question: content,
            productUrl: `${BASE_URL}/products/${productId}`
        });

        return respondWithFallback(req, res, `/products/${productId}`, { success: true, questionId: rows[0].id });
    } catch (error) {
        next(error);
    }
}

async function answerQuestion(req, res, next) {
    try {
        const productId = req.params.productId;
        const questionId = parseInt(req.params.questionId, 10);
        const answer = (req.body.answer || '').trim();
        if (!answer) {
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: 'Vui lòng nhập câu trả lời.' }, 400);
        }

        const questionRes = await db.query(
            `SELECT q.*, p.seller_id, p.name AS product_name, u.email AS asker_email
             FROM questions q
             JOIN products p ON q.product_id = p.id
             JOIN users u ON q.user_id = u.id
             WHERE q.id = $1 AND q.product_id = $2`,
            [questionId, productId]
        );
        if (!questionRes.rows.length) {
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: 'Câu hỏi không tồn tại.' }, 404);
        }
        const question = questionRes.rows[0];
        if (question.seller_id !== req.user.id) {
            return respondWithFallback(req, res, `/products/${productId}`, { success: false, message: 'Chỉ người bán mới được trả lời câu hỏi.' }, 403);
        }

        await db.query(
            'UPDATE questions SET answer_content = $1, answered_at = NOW(), answered_by = $2 WHERE id = $3',
            [answer, req.user.id, questionId]
        );

        // Fetch all bidders to notify
        const biddersRes = await db.query('SELECT DISTINCT u.email FROM bids b JOIN users u ON b.bidder_id = u.id WHERE b.product_id = $1', [productId]);
        const bidderEmails = biddersRes.rows.map(r => r.email);
        const toList = [...new Set([question.asker_email, ...bidderEmails])];

        const { sendAnswerEmail } = require('../services/email.service');
        await sendAnswerEmail({
            toList,
            productName: question.product_name,
            question: question.content,
            answer: answer,
            productUrl: `${BASE_URL}/products/${productId}`
        });

        return respondWithFallback(req, res, `/products/${productId}`, { success: true });
    } catch (error) {
        next(error);
    }
}

async function search(req, res, next) {
    return listProducts(req, res, next);
}

module.exports = {
    listProducts,
    detailPage,
    getCreateProduct,
    postCreateProduct,
    placeBid,
    buyNow,
    addToWatchlist,
    removeFromWatchlist,
    watchlistPage,
    postQuestion,
    answerQuestion,
    search
};
