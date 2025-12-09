const categoryModel = require('../models/category.model');
const productModel = require('../models/product.model');
const bidderRequestModel = require('../models/bidder-request.model');
const userModel = require('../models/user.model');

module.exports = {
    // Dashboard - Trang chính admin
    async getDashboard(req, res, next) {
        try {
            const db = require('../configs/db');
            
            // Thống kê từ database
            const userCountResult = await db.query('SELECT COUNT(*) FROM users');
            const productCountResult = await db.query("SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'");
            const categoryCountResult = await db.query('SELECT COUNT(*) FROM categories');
            const pendingBidders = await bidderRequestModel.countPending();
            
            const stats = {
                totalUsers: parseInt(userCountResult.rows[0].count),
                activeProducts: parseInt(productCountResult.rows[0].count),
                pendingBidders: pendingBidders,
                totalCategories: parseInt(categoryCountResult.rows[0].count)
            };

            // Hoạt động gần đây (dữ liệu giả - có thể implement sau)
            const recentActivities = [
                { time: '10 phút trước', user: 'Người dùng', action: 'Đăng ký tài khoản mới' },
                { time: '25 phút trước', user: 'Người bán', action: 'Tạo sản phẩm mới' },
                { time: '1 giờ trước', user: 'Người dùng', action: 'Yêu cầu nâng cấp Seller' },
                { time: '2 giờ trước', user: 'Người dùng', action: 'Cập nhật thông tin' }
            ];

            res.render('admin/dashboard', {
                stats,
                recentActivities,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error loading dashboard:', error);
            next(error);
        }
    },

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
    async postBidderRequest(req,res,next){
        try {
            const { user } = req.user;
            
            await bidderRequestModel.create(user.id)
            
            
            res.redirect('/user/profile?success=' + encodeURIComponent('Gửi yêu cầu thành công!'));
        } catch (error) {
            console.error('Error removing product:', error);
            res.redirect('/user/profile?error=' + encodeURIComponent(error.message));
        }        
    },

    // Quản lý yêu cầu đăng ký Bidder
    async listBidderRequests(req, res, next) {
        try {
            // Lấy data từ model
            const pendingRequests = await bidderRequestModel.getBidderRequests('PENDING');
            const approvedRequests = await bidderRequestModel.getBidderRequests('APPROVED');
            const rejectedRequests = await bidderRequestModel.getBidderRequests('REJECTED');
            
            // Format pending requests
            const formattedPending = pendingRequests.map(r => {
                const rating = r.rating >= 0 ? Math.round(r.rating) : 'Chưa có đánh giá';
                return {    
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    rating: rating,
                    requestDate: new Date(r.created_at).toLocaleString('vi-VN')
                };
            });
            
            // Format approved requests
            const formattedApproved = approvedRequests.map(r => {
                const total = (r.rating_positive_count || 0) + (r.rating_negative_count || 0);
                const rating = total > 0 ? Math.round((r.rating_positive_count / total) * 100) : 0;
                return {
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    rating: rating,
                    approvedDate: new Date(r.approved_at).toLocaleString('vi-VN'),
                    approvedBy: r.approved_by || 'Admin'
                };
            });
            
            // Format rejected requests
            const formattedRejected = rejectedRequests.map(r => {
                const total = (r.rating_positive_count || 0) + (r.rating_negative_count || 0);
                const rating = total > 0 ? Math.round((r.rating_positive_count / total) * 100) : 0;
                return {
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    rating: rating,
                    rejectedDate: new Date(r.rejected_at).toLocaleString('vi-VN'),
                    rejectedBy: r.rejected_by || 'Admin'
                };
            });

            res.render('admin/bidder-requests', {
                pendingRequests: formattedPending,
                approvedRequests: formattedApproved,
                rejectedRequests: formattedRejected,
                pendingCount: formattedPending.length,
                approvedCount: formattedApproved.length,
                rejectedCount: formattedRejected.length,
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg'),
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error listing bidder requests:', error);
            next(error);
        }
    },

    // Duyệt yêu cầu Bidder
    async approveBidderRequest(req, res, next) {
        try {
            const { id } = req.params;
            const adminId = req.user.id;
            
            // Approve request và lấy user_id
            const result = await bidderRequestModel.approve(id, adminId);
            
            if (!result) {
                req.flash('error_msg', 'Không tìm thấy yêu cầu hoặc đã được xử lý!');
                return res.redirect('/admin/bidder-requests');
            }
            
            // Cập nhật role user thành SELLER
            await userModel.updateRole(result.user_id, 'SELLER');
            
            req.flash('success_msg', 'Đã duyệt yêu cầu thành công!');
            res.redirect('/admin/bidder-requests');
        } catch (error) {
            console.error('Error approving bidder request:', error);
            req.flash('error_msg', error.message);
            res.redirect('/admin/bidder-requests');
        }
    },

    // Từ chối yêu cầu Bidder
    async rejectBidderRequest(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const adminId = req.user.id;
            
            // Reject request
            const result = await bidderRequestModel.reject(id, adminId, reason || 'Không đủ điều kiện');
            
            if (!result) {
                req.flash('error_msg', 'Không tìm thấy yêu cầu hoặc đã được xử lý!');
                return res.redirect('/admin/bidder-requests');
            }
            
            req.flash('success_msg', 'Đã từ chối yêu cầu!');
            res.redirect('/admin/bidder-requests');
        } catch (error) {
            console.error('Error rejecting bidder request:', error);
            req.flash('error_msg', error.message);
            res.redirect('/admin/bidder-requests');
        }
    },

    // Quản lý người dùng - Danh sách
    async listUsers(req, res, next) {
        try {
            const { search, role, status } = req.query;

            // Dữ liệu giả - Users
            const allUsers = [
                { id: 1, name: 'Nguyễn Văn A', nameInitial: 'NA', email: 'nguyenvana@email.com', role: 'SELLER', status: 'ACTIVE', rating: 8.5, createdAt: '2024-12-01' },
                { id: 2, name: 'Trần Thị B', nameInitial: 'TB', email: 'tranthib@email.com', role: 'BIDDER', status: 'ACTIVE', rating: 9.2, createdAt: '2024-12-05' },
                { id: 3, name: 'Lê Minh C', nameInitial: 'LC', email: 'leminhc@email.com', role: 'SELLER', status: 'ACTIVE', rating: 7.8, createdAt: '2024-12-10' },
                { id: 4, name: 'Phạm Thị D', nameInitial: 'PD', email: 'phamthid@email.com', role: 'BIDDER', status: 'INACTIVE', rating: 6.5, createdAt: '2024-12-15' },
                { id: 5, name: 'Hoàng Văn E', nameInitial: 'HE', email: 'hoangvane@email.com', role: 'BIDDER', status: 'BANNED', rating: 4.2, createdAt: '2024-11-20' }
            ];

            // Lọc users (giả)
            let users = allUsers;
            
            if (search) {
                users = users.filter(u => 
                    u.name.toLowerCase().includes(search.toLowerCase()) || 
                    u.email.toLowerCase().includes(search.toLowerCase())
                );
            }
            
            if (role) {
                users = users.filter(u => u.role === role);
            }
            
            if (status) {
                users = users.filter(u => u.status === status);
            }

            res.render('admin/users', {
                users,
                search,
                role,
                status,
                success_msg: req.query.success,
                error_msg: req.query.error,
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error listing users:', error);
            next(error);
        }
    },

    // Khóa tài khoản user
    async banUser(req, res, next) {
        try {
            const { id } = req.params;
            
            // TODO: Cập nhật status user trong database
            // await userModel.updateStatus(id, 'BANNED');
            
            res.redirect('/admin/users?success=' + encodeURIComponent('Đã khóa tài khoản người dùng!'));
        } catch (error) {
            console.error('Error banning user:', error);
            res.redirect('/admin/users?error=' + encodeURIComponent(error.message));
        }
    },

    // Mở khóa tài khoản user
    async unbanUser(req, res, next) {
        try {
            const { id } = req.params;
            
            // TODO: Cập nhật status user trong database
            // await userModel.updateStatus(id, 'ACTIVE');
            
            res.redirect('/admin/users?success=' + encodeURIComponent('Đã mở khóa tài khoản người dùng!'));
        } catch (error) {
            console.error('Error unbanning user:', error);
            res.redirect('/admin/users?error=' + encodeURIComponent(error.message));
        }
    }
};
