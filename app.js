const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
require('dotenv').config();
require('express-async-errors'); 

// Import Passport config đã viết
const passport = require('./src/configs/passport');

const app = express();

// 1. Cấu hình Public & Body Parser
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));// middleware parse http request vào request.body

// 2. Cấu hình Session (BẮT BUỘC PHẢI CÓ TRƯỚC PASSPORT)
app.use(session({
    secret: process.env.SESSION_SECRET || 'ban_quen_cau_hinh_env_roi',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 ngày
})); // check co cookie khong, nếu không tạo gửi request set cookie, nếu có quán vào 
// request.session để lưu thông tin người người dùng khi load lại trang

// 3. Khởi động Passport (BẮT BUỘC)
app.use(passport.initialize());
app.use(passport.session()); // nhin vào request.session do middleware ở trên tạo ra
//tìm passport.user, nếu có gọi assport.deserializeUser( hàm viết trong file config) 
// để query DB lấy thông tin đầy đủ, gán kết quản vào biết request.user
// sau đó mọi controller nhìn vào request.user để biết user tạo ra request này là ai


// 4. Middleware Locals (Chia sẻ thông tin user xuống View)
app.use(function (req, res, next) {
    res.locals.isAuth = req.isAuthenticated();
    res.locals.authUser = req.user;
    next();
});// gán user vào biến result.local

// 5. Cấu hình View Engine
app.engine('hbs', engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: 'src/views/layouts',
    partialsDir: 'src/views/partials',
    helpers: {
        // Các helpers sau này sẽ thêm ở đây
    }
}));
app.set('view engine', 'hbs');
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
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});