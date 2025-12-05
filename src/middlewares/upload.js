// src/middlewares/upload.js
const multer = require('multer');

// Cấu hình lưu trữ file trong bộ nhớ RAM
// Chúng ta sẽ không lưu file tạm trên server mà xử lý trực tiếp buffer
const storage = multer.memoryStorage();

// Middleware upload
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn kích thước file là 5MB
    },
    fileFilter: (req, file, cb) => {
        // Chỉ chấp nhận các file ảnh
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh!'), false);
        }
    }
});

module.exports = upload;