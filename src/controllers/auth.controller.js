const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const emailService = require('../services/email.service'); // Thêm dòng này
const crypto = require('crypto'); // Thư viện sẵn có của Node.js

module.exports = {
    // 1. Hiển thị form đăng ký
    getRegister(req, res) {
        res.render('account/register', { layout: 'auth', title: 'Đăng ký' });
    },

    // 2. Xử lý đăng ký
    async postRegister(req, res) {
        const { full_name, email, password, confirm_password } = req.body;

        // Validate cơ bản
        if (password !== confirm_password) {
            return res.render('account/register', {
                layout: 'auth',
                title: 'Đăng ký',
                error_msg: 'Mật khẩu xác nhận không khớp!',
                old_values: req.body // Giữ lại giá trị cũ để user đỡ phải nhập lại
            });
        }

        // Check trùng email
        const user = await userModel.findByEmail(email);
        if (user) {
            return res.render('account/register', {
                layout: 'auth',
                title: 'Đăng ký',
                error_msg: 'Email này đã được sử dụng!',
                old_values: req.body
            });
        }


        // Mã hóa mật khẩu
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password1, salt);
        const otp = crypto.randomInt(100000, 999999).toString();
        // Lưu vào DB
        const newUser = {
            name: name,
            email,
            password: hash,
            address
        };
        await userModel.add(newUser);
        await emailService.sendVerificationEmail(email, otp);

        // Thành công -> Chuyển qua trang login
        // res.redirect('/verify-otp');
        res.render('account/verify-otp',{
            email,
        })
    },

    // 3. Hiển thị form login
    getLogin(req, res) {
        // Nếu có query success thì hiện thông báo
        const success_msg = req.query.register_success ? 'Đăng ký thành công, hãy đăng nhập!' : null;
        res.render('account/login', { layout: 'auth', title: 'Đăng nhập', success_msg });
    },

    // 4. Xử lý Logout
    postLogout(req, res, next) {
        req.logout(function (err) {
            if (err) { return next(err); }
            res.redirect('/');
        });
    },
    getProfile(req,res){
        // console.log('=== PROFILE DEBUG ===');
        // console.log('req.isAuthenticated():', req.isAuthenticated());
        console.log('req.user:', req.user);
        // console.log('req.session:', req.session);
        // console.log('===================');
        
        if (!req.isAuthenticated()) {
            return res.redirect('/auth/login');
        }
        
        // Format birthday cho input type="date"
        const user = { ...req.user };
        if (user.birthday) {
            user.birthday = new Date(user.birthday).toISOString().split('T')[0];
        }
        
        res.render('account/profile', { user });
    },
    async postProfile(req,res){
        
        try {
            const  {name,email,address,birthday} = req.body
            const id = req.user.id
            const newUser = {
                id ,
                name,
                email,
                address,
                birthday
            };
        console.log('user ne',newUser)
        const user = await userModel.update(newUser)
        console.log('user moi ne',user)
        
        // Format birthday cho input type="date"
        if (user.birthday) {
            user.birthday = new Date(user.birthday).toISOString().split('T')[0];
        }
        
        res.render('account/profile',{
            user,
            success_msg:'Cập nhật thành công'
        })
        } catch (error) {
            console.error('Update error:', error);
            res.render('account/profile', {
                user: req.user,
                error_msg: 'update failure: ' + error.message
            });
        }
       
    }
};