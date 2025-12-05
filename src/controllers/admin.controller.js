const categoryModel = require('../models/category.model');

module.exports = {
    // Hiển thị danh sách categories
    async listCategories(req, res, next) {
        try {
            const categories = await categoryModel.getTree();
            
            res.render('admin/categories', {
                categories,
                success_msg: req.query.success,
                error_msg: req.query.error,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error listing categories:', error);
            next(error);
        }
    },

    // Tạo category mới
    async createCategory(req, res, next) {
        try {
            const { name, parent_id } = req.body;

            // Validate
            if (!name || name.trim() === '') {
                return res.redirect('/admin/categories?error=' + encodeURIComponent('Tên danh mục không được để trống!'));
            }

            // Kiểm tra trùng tên
            const parentIdValue = parent_id && parent_id !== '' ? parseInt(parent_id) : null;
            const isDuplicate = await categoryModel.checkDuplicate(name.trim(), parentIdValue);
            
            if (isDuplicate) {
                return res.redirect('/admin/categories?error=' + encodeURIComponent('Tên danh mục đã tồn tại!'));
            }

            // Tạo category
            await categoryModel.create(name.trim(), parentIdValue);
            
            res.redirect('/admin/categories?success=' + encodeURIComponent('Thêm danh mục thành công!'));
        } catch (error) {
            console.error('Error creating category:', error);
            res.redirect('/admin/categories?error=' + encodeURIComponent(error.message));
        }
    },

    // Cập nhật category
    async updateCategory(req, res, next) {
        try {
            const { id } = req.params;
            const { name, parent_id } = req.body;

            // Validate
            if (!name || name.trim() === '') {
                return res.redirect('/admin/categories?error=' + encodeURIComponent('Tên danh mục không được để trống!'));
            }

            // Không cho phép đặt parent_id = chính nó
            const parentIdValue = parent_id && parent_id !== '' ? parseInt(parent_id) : null;
            if (parentIdValue === parseInt(id)) {
                return res.redirect('/admin/categories?error=' + encodeURIComponent('Không thể đặt danh mục làm cha của chính nó!'));
            }

            // Kiểm tra trùng tên (trừ chính nó)
            const isDuplicate = await categoryModel.checkDuplicate(name.trim(), parentIdValue, id);
            if (isDuplicate) {
                return res.redirect('/admin/categories?error=' + encodeURIComponent('Tên danh mục đã tồn tại!'));
            }

            // Cập nhật
            await categoryModel.update(id, name.trim(), parentIdValue);
            
            res.redirect('/admin/categories?success=' + encodeURIComponent('Cập nhật danh mục thành công!'));
        } catch (error) {
            console.error('Error updating category:', error);
            res.redirect('/admin/categories?error=' + encodeURIComponent(error.message));
        }
    },

    // Xóa category
    async deleteCategory(req, res, next) {
        try {
            const { id } = req.params;
            
            await categoryModel.delete(id);
            
            res.redirect('/admin/categories?success=' + encodeURIComponent('Xóa danh mục thành công!'));
        } catch (error) {
            console.error('Error deleting category:', error);
            res.redirect('/admin/categories?error=' + encodeURIComponent(error.message));
        }
    }
};
