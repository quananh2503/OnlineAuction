const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload'); // Import middleware upload
const productController = require('../controllers/product.controller');
const { route } = require('./auth.route');
const { supabase } = require('../utils/supabaseClient'); // Import supabase client
const productModel = require("../models/product.model")
// // Trang feed hiển thị danh sách sản phẩm đấu giá
// router.get('/feed', productController.getFeed);

// Route danh sách sản phẩm (Search, Filter, Pagination)
router.get('/', productController.listProducts);

// Route cụ thể trước, route động sau
router.get('/create', productController.getCreateProduct);
router.post('/create', upload.fields([
    { name: 'avatarImage', maxCount: 1 },
    { name: 'descriptionImages', maxCount: 10 }
]), async (req, res) => {
    try {
        // Dữ liệu text từ form
        const {
            name,
            category_id,
            description,
            starts_at,
            ends_at,
            starting_price,
            price_step,
            buy_now_price
        } = req.body;

        // Validate files
        if (!req.files || !req.files.avatarImage || !req.files.descriptionImages) {
            return res.status(400).send('Vui lòng chọn đầy đủ ảnh (1 avatar + ít nhất 3 ảnh mô tả).');
        }

        if (req.files.descriptionImages.length < 3) {
            return res.status(400).send('Vui lòng chọn ít nhất 3 ảnh mô tả sản phẩm.');
        }

        const bucketName = 'productimages';
        const avatarFile = req.files.avatarImage[0];
        const descriptionFiles = req.files.descriptionImages;

        // Helper function: Sanitize filename
        const sanitizeFilename = (filename) => {
            // Lấy extension
            const ext = filename.substring(filename.lastIndexOf('.'));
            // Loại bỏ extension, chuyển thành slug
            const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
            const sanitized = nameWithoutExt
                .normalize('NFD') // Tách dấu tiếng Việt
                .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-') // Thay ký tự đặc biệt bằng -
                .replace(/^-+|-+$/g, ''); // Xóa - ở đầu/cuối
            return sanitized + ext;
        };

        // Upload avatar
        const avatarFileName = `avatar-${Date.now()}-${sanitizeFilename(avatarFile.originalname)}`;
        const { error: avatarError } = await supabase.storage
            .from(bucketName)
            .upload(avatarFileName, avatarFile.buffer, {
                contentType: avatarFile.mimetype
            });

        if (avatarError) throw avatarError;

        const { data: avatarUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(avatarFileName);

        // Upload description images
        const descriptionUrls = [];
        for (let i = 0; i < descriptionFiles.length; i++) {
            const file = descriptionFiles[i];
            const fileName = `desc-${Date.now()}-${i}-${sanitizeFilename(file.originalname)}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            descriptionUrls.push(urlData.publicUrl);
        }

        // Lưu vào database
        const productData = {
            seller_id: req.user?.id || 10, // TODO: Cần middleware auth, tạm dùng 1
            category_id: parseInt(category_id),
            name: name.trim(),
            description: description?.trim() || null,
            starts_at: starts_at,
            ends_at: ends_at,
            starting_price: parseFloat(starting_price),
            price_step: parseFloat(price_step),
            buy_now_price: buy_now_price ? parseFloat(buy_now_price) : null,
            avatar_url: avatarUrlData.publicUrl,
            image_urls: descriptionUrls
        };

        await productModel.create(productData);

        // Chuyển hướng về trang chủ sau khi thêm thành công
        res.redirect('/');

    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        res.render('500'); // Hoặc hiển thị trang lỗi
    }
});

// Route động phải đặt sau cùng
router.get('/:id', productController.getProductDetail);

// router.get('?sea')
module.exports = router;
