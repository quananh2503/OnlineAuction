const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload'); // Import middleware upload
const productController = require('../controllers/product.controller');
const { route } = require('./auth.route');
const { supabase } = require('../utils/supabaseClient'); // Import supabase client
const productModel = require("../models/product.model") 
// // Trang feed hiển thị danh sách sản phẩm đấu giá
// router.get('/feed', productController.getFeed);

// Route cụ thể trước, route động sau
router.get('/create', async(req,res) => {
    res.render('product/create-product')
})
router.post('/create', upload.single('productImage'), async (req, res) => {
    try {
        // Dữ liệu text từ form sẽ nằm trong req.body
        const { name, price, description } = req.body;

        // Dữ liệu file sau khi qua multer sẽ nằm trong req.file
        if (!req.file) {
            return res.status(400).send('Vui lòng chọn một file ảnh.');
        }

        // Tạo một tên file duy nhất để tránh trùng lặp
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const bucketName = 'productimages'; // Tên bucket bạn đã tạo

        // Upload file lên Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype
            });

        if (uploadError) {
            throw uploadError;
        }

        // Lấy URL công khai của file vừa upload
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // Lưu thông tin sản phẩm (bao gồm cả image_url) vào database
        const newProduct = {
            name,
            price: parseInt(price, 10),
            description,
            image_url: publicUrl // Lưu đường dẫn ảnh
        };

        // Giả sử bạn có hàm create trong model
        await productModel.create(newProduct);
        
        // Chuyển hướng về trang chủ sau khi thêm thành công
        res.redirect('/');

    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        res.render('500'); // Hoặc hiển thị trang lỗi
    }
});

// Route động phải đặt sau cùng
// router.get('/:id', productController.getProductDetail);

// router.get('?sea')
module.exports = router;
