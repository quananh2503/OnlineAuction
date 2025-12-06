const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const emailService = require('../services/email.service'); // Thêm dòng này
const crypto = require('crypto'); // Thư viện sẵn có của Node.js
const axios = require('axios');

module.exports = {
    // 1. Hiển thị form đăng ký
    getRegister(req, res) {
        res.render('account/register', { layout: 'auth' });
    },

    // 2. Xử lý đăng ký
    async postRegister(req, res) {
        console.log('register req.body:', req.body);
        
        const { name, email, password1, password2, address } = req.body;

        // Validate cơ bản
        if (password1 !== password2) {
            return res.render('account/register', {
                layout: 'auth',
                error_msg: 'Mật khẩu xác nhận không khớp!',
                old_values: req.body // Giữ lại giá trị cũ để user đỡ phải nhập lại
            });
        }

        // Check trùng email
        const user = await userModel.findByEmail(email);
        if (user) {
            return res.render('account/register', {
                layout: 'auth',
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
            name,
            email,
            password: hash,
            address,
            otp
        };
        await userModel.add(newUser);
        await emailService.sendVerificationEmail(email, otp);

        // Thành công -> Chuyển qua trang login
        // res.redirect('/verify-otp');
        res.render('account/verify-otp',{
            layout: 'auth',
            email,
        })
    },

    // 3. Hiển thị form login
    getLogin(req, res) {
        // Nếu có query success thì hiện thông báo
        const success_msg = req.query.register_success ? 'Đăng ký thành công, hãy đăng nhập!' : null;
        res.render('account/login', { 
            layout: 'auth', 
            success_msg,
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
        });
    },

    // 3.1. Xử lý Login với reCAPTCHA v3 verification (middleware trước passport.authenticate)
    async verifyRecaptcha(req, res, next) {
        const recaptchaResponse = req.body['g-recaptcha-response'];
        
        if (!recaptchaResponse) {
            return res.render('account/login', {
                layout: 'auth',
                error_msg: 'Lỗi xác thực bảo mật. Vui lòng thử lại!',
                recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
            });
        }

        try {
            // Gọi API Google để verify
            const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
            const response = await axios.post(verifyUrl);
            
            // reCAPTCHA v3 trả về score từ 0.0 đến 1.0 (1.0 = chắc chắn là người, 0.0 = chắc chắn là bot)
            if (response.data.success && response.data.score >= 0.5) {
                next(); // Score >= 0.5 được coi là con người, tiếp tục xử lý login
            } else {
                console.log('reCAPTCHA score:', response.data.score);
                return res.render('account/login', {
                    layout: 'auth',
                    error_msg: 'Phát hiện hoạt động bất thường. Vui lòng thử lại sau!',
                    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
                });
            }
        } catch (error) {
            console.error('reCAPTCHA verification error:', error);
            return res.render('account/login', {
                layout: 'auth',
                error_msg: 'Lỗi xác thực bảo mật. Vui lòng thử lại!',
                recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
            });
        }
    },

    // 4. Xử lý Logout
    postLogout(req, res, next) {
        req.logout(function (err) {
            if (err) { return next(err); }
            
            // Xóa session khỏi database
            req.session.destroy(function (err) {
                if (err) {
                    console.error('Error destroying session:', err);
                }
                res.redirect('/');
            });
        });
    },
    getProfile(req,res){
        // console.log('=== PROFILE DEBUG ===');
        // console.log('req.isAuthenticated():', req.isAuthenticated());
        console.log('req.user:', req.user);
        // console.log('req.session:', req.session);
        // console.log('===================');
        
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
       
    },
    async getChangePassword(req,res){
        res.render('account/change-password')
    },
    async postChangePassword(req,res){
        try {
            console.log('change password usser',req.user)
            const {oldPassword,newPassword,newPasswordConfirm} = req.body
            const userId = req.user.id
            if (newPassword!==newPasswordConfirm){
                res.render('account/change-password',{
                    error_msg:'new password not match'
                })
            }

        
            const user = await userModel.findById(userId)

             const isMatch = await bcrypt.compare(oldPassword, user.password);

            if (!isMatch){
               
                throw new Error('old password not match')
            }
            const salt = bcrypt.genSaltSync(10);
            const newhash =  bcrypt.hashSync(newPassword, salt);
            const newUser =await userModel.updatePassword(userId,newhash)

            res.render('account/change-password',{
                success_msg:"password changed"
            })
            
        } catch (error) {
            res.render('account/change-password',{
                error_msg:error.message
            })
            
        }
        

    },
    async getVerifyOTP(req,res){
        const email = req.query.email || req.session.email;
        res.render('account/verify-otp',{
            layout: 'auth',
            email
        })
    },
    async postVerifyOTP(req,res){
        const {email,otp} = req.body 
         console.log("verify req :",req.body)
        try {
            const result = await userModel.checkOTP(email,otp)
            if (!result.exists){
                throw new Error('OTP not match')
            }
            await userModel.active(email)
            res.redirect("/auth/login")
            

            
        } catch (error) {
            res.render('account/verify-otp',{
                layout: 'auth',
                email,
                error_msg:error.message
            })
        }   
    },
    async resendOTP(req,res){
        // res.render('account/verify-otp')
        try {
            const {email} = req.body 
            console.log("resendOTP req :",req.body)
            const newOtp = crypto.randomInt(100000, 999999).toString();
            await userModel.updateOTP(email,newOtp) 
            await emailService.sendVerificationEmail(email,newOtp)
             res.render('account/verify-otp',{
                layout: 'auth',
                email,
                success_msg:"A new OTP has been sent to your email."
             })
        } catch (error) {
             res.render('account/verify-otp',{
                layout: 'auth',
                email,
                error_msg:error.message
             })
        }   
    
    }
};