const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');

module.exports = {
    // 1. Hiển thị form đăng ký
    getRegister(req, res) {
        res.render('account/register');
    },

    // 2. Xử lý đăng ký
    async postRegister(req, res) {
        const { full_name, email, password, confirm_password } = req.body;

        // Validate cơ bản
        if (password !== confirm_password) {
            return res.render('account/register', {
                error_msg: 'Mật khẩu xác nhận không khớp!',
                old_values: req.body // Giữ lại giá trị cũ để user đỡ phải nhập lại
            });
        }

        // Check trùng email
        const user = await userModel.findByEmail(email);
        if (user) {
            return res.render('account/register', {
                error_msg: 'Email này đã được sử dụng!',
                old_values: req.body
            });
        }

        // Mã hóa mật khẩu
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        // Lưu vào DB
        const newUser = {
            full_name,
            email,
            password: hash
        };
        await userModel.add(newUser);

        // Thành công -> Chuyển qua trang login
        res.redirect('/auth/login?register_success=true');
    },

    // 3. Hiển thị form login
    getLogin(req, res) {
        // Nếu có query success thì hiện thông báo
        const success_msg = req.query.register_success ? 'Đăng ký thành công, hãy đăng nhập!' : null;
        res.render('account/login', { success_msg });
    },

    // 4. Xử lý Logout
    postLogout(req, res, next) {
        req.logout(function (err) {
            if (err) { return next(err); }
            res.redirect('/');
        });
    }
};