
require('dotenv').config();
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
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
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

// 6. ROUTES (PHẦN BẠN BỊ THIẾU)
// Tải file route tổng hợp (index.route.js)
const mainRouter = require('./src/routes/index.route');
app.use('/', mainRouter);

// (Xóa đoạn app.get hardcode cũ đi vì nó đã nằm trong router rồi)

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