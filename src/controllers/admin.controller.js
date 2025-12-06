const categoryModel = require('../models/category.model');
const productModel = require('../models/product.model');

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
    },

    // Quản lý sản phẩm - Danh sách
    async listProducts(req, res, next) {
        try {
            const q = (req.query.q || '').trim();
            const category = req.query.category || '';
            const status = req.query.status || '';
            const page = Math.max(1, parseInt(req.query.page || '1', 10));
            const limit = 12;

            // Lấy tất cả sản phẩm
            const allProducts = await productModel.listAllProducts();
            
            // Format products
            const formatDateTimeLocal = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}`;
            };

            let products = allProducts.map(p => ({
                id: p.id,
                title: p.name,
                image: p.avatar_url,
                currentPrice: p.current_price || p.starting_price,
                currentPriceFormatted: (p.current_price || p.starting_price).toLocaleString('vi-VN'),
                bidsCount: p.bid_count || 0,
                buyNowPrice: p.buy_now_price ? p.buy_now_price.toLocaleString('vi-VN') : null,
                createdAt: formatDateTimeLocal(p.starts_at),
                endsAt: formatDateTimeLocal(p.ends_at),
                category: p.category_name,
                seller: { name: p.seller_name, id: p.seller_id },
                status: p.status
            }));

            // Filter by search query
            if (q) {
                const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
                products = products.filter(p => 
                    terms.every(t => 
                        p.title.toLowerCase().includes(t) || 
                        p.category.toLowerCase().includes(t) ||
                        p.seller.name.toLowerCase().includes(t)
                    )
                );
            }

            // Filter by category
            if (category) {
                products = products.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
            }

            // Filter by status
            if (status) {
                products = products.filter(p => p.status === status);
            }

            // Pagination
            const total = products.length;
            const totalPages = Math.max(1, Math.ceil(total / limit));
            const offset = (page - 1) * limit;
            const pageProducts = products.slice(offset, offset + limit);

            // Get categories for filter
            const categories = await categoryModel.getTree();

            res.render('admin/products', {
                products: pageProducts,
                categories,
                total,
                page,
                totalPages,
                q,
                category,
                status,
                success_msg: req.query.success,
                error_msg: req.query.error,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error listing products:', error);
            next(error);
        }
    },

    // Gỡ bỏ sản phẩm
    async removeProduct(req, res, next) {
        try {
            const { id } = req.params;
            
            await productModel.updateStatus(id, 'REMOVED');
            
            res.redirect('/admin/products?success=' + encodeURIComponent('Gỡ bỏ sản phẩm thành công!'));
        } catch (error) {
            console.error('Error removing product:', error);
            res.redirect('/admin/products?error=' + encodeURIComponent(error.message));
        }
    },

    // Quản lý yêu cầu đăng ký Bidder - Dữ liệu giả
    async listBidderRequests(req, res, next) {
        try {
            // Dữ liệu giả - Pending requests
            const pendingRequests = [
                {
                    id: 1,
                    name: 'Nguyễn Văn A',
                    nameInitial: 'NA',
                    email: 'nguyenvana@email.com',
                    rating: 8.5,
                    stars: [true, true, true, true, true, false, false, false, false, false],
                    requestDate: '2025-01-15 10:30'
                },
                {
                    id: 2,
                    name: 'Trần Thị B',
                    nameInitial: 'TB',
                    email: 'tranthib@email.com',
                    rating: 9.2,
                    stars: [true, true, true, true, true, false, false, false, false, false],
                    requestDate: '2025-01-16 14:20'
                },
                {
                    id: 3,
                    name: 'Lê Minh C',
                    nameInitial: 'LC',
                    email: 'leminhc@email.com',
                    rating: 7.8,
                    stars: [true, true, true, true, false, false, false, false, false, false],
                    requestDate: '2025-01-17 09:15'
                },
                {
                    id: 4,
                    name: 'Phạm Thị D',
                    nameInitial: 'PD',
                    email: 'phamthid@email.com',
                    rating: 6.5,
                    stars: [true, true, true, false, false, false, false, false, false, false],
                    requestDate: '2025-01-18 11:45'
                },
                {
                    id: 5,
                    name: 'Hoàng Văn E',
                    nameInitial: 'HE',
                    email: 'hoangvane@email.com',
                    rating: 9.8,
                    stars: [true, true, true, true, true, false, false, false, false, false],
                    requestDate: '2025-01-19 16:00'
                }
            ];

            // Dữ liệu giả - Approved requests
            const approvedRequests = [
                {
                    id: 6,
                    name: 'Vũ Thị F',
                    nameInitial: 'VF',
                    email: 'vuthif@email.com',
                    rating: 8.9,
                    approvedDate: '2025-01-10 14:30',
                    approvedBy: 'Admin Nguyễn'
                },
                {
                    id: 7,
                    name: 'Đặng Văn G',
                    nameInitial: 'DG',
                    email: 'dangvang@email.com',
                    rating: 9.5,
                    approvedDate: '2025-01-12 10:15',
                    approvedBy: 'Admin Nguyễn'
                }
            ];

            // Dữ liệu giả - Rejected requests
            const rejectedRequests = [
                {
                    id: 8,
                    name: 'Bùi Thị H',
                    nameInitial: 'BH',
                    email: 'buithih@email.com',
                    rating: 5.2,
                    rejectedDate: '2025-01-08 09:20',
                    rejectedBy: 'Admin Nguyễn'
                }
            ];

            res.render('admin/bidder-requests', {
                pendingRequests,
                approvedRequests,
                rejectedRequests,
                pendingCount: pendingRequests.length,
                approvedCount: approvedRequests.length,
                rejectedCount: rejectedRequests.length,
                success_msg: req.query.success,
                error_msg: req.query.error,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error listing bidder requests:', error);
            next(error);
        }
    },

    // Duyệt yêu cầu Bidder (giả)
    async approveBidderRequest(req, res, next) {
        try {
            const { id } = req.params;
            
            // TODO: Cập nhật role user trong database
            // await userModel.updateRole(id, 'BIDDER');
            
            res.redirect('/admin/bidder-requests?success=' + encodeURIComponent('Đã duyệt yêu cầu thành công!'));
        } catch (error) {
            console.error('Error approving bidder request:', error);
            res.redirect('/admin/bidder-requests?error=' + encodeURIComponent(error.message));
        }
    },

    // Từ chối yêu cầu Bidder (giả)
    async rejectBidderRequest(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            
            // TODO: Cập nhật status yêu cầu trong database
            // await bidderRequestModel.reject(id, reason);
            
            res.redirect('/admin/bidder-requests?success=' + encodeURIComponent('Đã từ chối yêu cầu!'));
        } catch (error) {
            console.error('Error rejecting bidder request:', error);
            res.redirect('/admin/bidder-requests?error=' + encodeURIComponent(error.message));
        }
    }
};
