
require('dotenv').config();

// Suppress deprecation warnings from dependencies (e.g., passport, connect-pg-simple)
process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning' && warning.message.includes('util.isArray')) {
        // Suppress util.isArray deprecation warnings from dependencies
        return;
    }
    // Show other warnings normally
    console.warn(warning.name, warning.message);
});

console.log('--- KIỂM TRA BIẾN MÔI TRƯỜNG ---');
console.log('DB Host:', process.env.DB_HOST);
console.log('DB Port:', process.env.DB_PORT);
console.log('DB User:', process.env.DB_USER);
console.log('DB Database:', process.env.DB_DATABASE);
console.log('DB Password:', process.env.DB_PASSWORD ? 'Đã có mật khẩu' : 'KHÔNG CÓ MẬT KHẨU'); // In ra để kiểm tra có tồn tại không, không in mật khẩu thật
console.log('------------------------------------');

const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const flash = require('connect-flash');
const db = require('./src/configs/db');
const { formatMoney, maskName } = require('./src/utils/format');
const { formatRelativeOrAbsolute } = require('./src/utils/time');

require('express-async-errors');

// Import Passport config đã viết
const passport = require('./src/configs/passport');

const app = express();

// 1. Cấu hình Public & Body Parser
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Cấu hình Session với PostgreSQL (BẮT BUỘC PHẢI CÓ TRƯỚC PASSPORT)
app.use(session({
    store: new pgSession({
        pool: db.pool, // Sử dụng pool từ db.js
        tableName: 'session',
        createTableIfMissing: false, // Bảng đã tạo rồi
        errorLog: (err) => {
            console.error('Session store error:', err);
        }
    }),
    secret: process.env.SESSION_SECRET || 'ban_quen_cau_hinh_env_roi',
    resave: false,
    saveUninitialized: false, // Không lưu session rỗng
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        secure: false, // Set true nếu dùng HTTPS
        httpOnly: true
    }
}));

// 3. Khởi động Passport (BẮT BUỘC)
app.use(passport.initialize());
app.use(passport.session());

// 3.5. Flash messages
app.use(flash());

// 4. Middleware Locals (Chia sẻ thông tin user xuống View)
app.use(function (req, res, next) {
    res.locals.isAuth = req.isAuthenticated();
    res.locals.authUser = req.user;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    // favicon version for cache-busting (increment to force clients to reload favicon)
    res.locals.faviconVersion = process.env.FAVICON_VERSION || '1';
    next();
});// gán user vào biến result.local

// Middleware Categories (Cho menu header)
app.use(require('./src/middlewares/category.middleware'));

// 5. Cấu hình View Engine
app.engine('hbs', engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: 'src/views/layouts',
    partialsDir: 'src/views/partials',
    helpers: {
        formatMoney,
        maskName,
        formatRelativeTime: formatRelativeOrAbsolute,
        section: function (name, options) {
            if (!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        },
        json: function (context) {
            return JSON.stringify(context);
        },
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
        and: (a, b) => a && b,
        or: (a, b) => a || b,
        ifEquals: function (a, b, opts) { return a === b ? opts.fn(this) : opts.inverse(this); },
        add: (a, b) => a + b,
        subtract: (a, b) => a - b,
        gt: (a, b) => a > b,
        lt: (a, b) => a < b,
        range: function (start, end, options) {
            const arr = [];
            for (let i = start; i <= end; i++) arr.push(i);
            return arr;
        }
    }
}));
app.set('view engine', 'hbs');
app.set('view cache', false); // Tắt cache cho development
app.set('views', './src/views');

// 6. ROUTES
const mainRouter = require('./src/routes/index.route');
app.use('/', mainRouter);

// 6.5. Background Jobs (Kiểm tra đấu giá kết thúc)
const { checkExpiredAuctions } = require('./src/services/auction.service');
const cronService = require('./src/services/cron.service');

// Chạy mỗi phút một lần
setInterval(checkExpiredAuctions, 60 * 1000);
// Chạy ngay khi khởi động server
checkExpiredAuctions();

// Start payment check cron
cronService.start();

// 7. Xử lý lỗi 404 (Không tìm thấy trang) & 500 (Lỗi Server)
app.use((req, res, next) => {
    res.status(404).render('404', { layout: false });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('500', { layout: false });
});

// 8. Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

// Graceful shutdown - Đóng connection pool khi tắt server
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await db.pool.end();
        console.log('Database pool closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await db.pool.end();
        console.log('Database pool closed');
        process.exit(0);
    });
});