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

        // 5. OK -> Trả về user
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

module.exports = passport;