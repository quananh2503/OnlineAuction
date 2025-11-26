const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');

passport.use(new LocalStrategy({
    usernameField: 'email', // Tên field trong form HTML
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        // 1. Tìm user trong DB
        const user = await userModel.findByEmail(email);
        
        // 2. Nếu không có user -> Báo lỗi
        if (!user) {
            return done(null, false, { message: 'Email không tồn tại!' });
        }

        // 3. Nếu user đăng nhập Google (không có pass) -> Báo lỗi
        if (!user.password) {
            return done(null, false, { message: 'Tài khoản này đăng nhập bằng Google, vui lòng chọn Google Login.' });
        }

        // 4. So sánh mật khẩu (Đã mã hóa)
        const ret = await bcrypt.compare(password, user.password);
        if (!ret) {
            return done(null, false, { message: 'Mật khẩu không chính xác!' });
        }

        // 5. Kiểm tra trạng thái active
        if (user.status !== 'ACTIVE') {
            return done(null, false, { 
                message: 'Tài khoản chưa được kích hoạt!',
                needVerify: true,
                email: user.email
            });
        }

        // 6. OK -> Trả về user
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Lưu ID user vào session sau khi login thành công
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Lấy thông tin user từ session mỗi khi tải trang
passport.deserializeUser(async (id, done) => {
    try {
        const user = await userModel.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// ... (LocalStrategy cũ vẫn giữ nguyên)

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // profile chứa thông tin user từ Google
        const email = profile.emails[0].value;
        
        // Kiểm tra user đã tồn tại chưa
        let user = await userModel.findByEmail(email);
        
        if (user.active =='INACTIVE' ) {
            // User đã có trong DB -> Đăng nhập luôn
            // return done(null, user);
        }
        
        // User mới -> Tạo tài khoản
        const newUser = {
            name: profile.displayName,
            email: email,
            google_id: profile.id,
            password: null,  // Không có password vì đăng nhập Google
            // avatar: profile.photos[0]?.value
        };
        
        const userId = await userModel.add(newUser);
        createdUser = userId;
        
        return done(null, createdUser);
    } catch (err) {
        return done(err, null);
    }
}));
module.exports = passport;