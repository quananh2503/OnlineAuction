const categoryModel = require('../models/category.model');
const productModel = require('../models/product.model');
const bidderRequestModel = require('../models/bidder-request.model');
const userModel = require('../models/user.model');
const db = require('../configs/db');
const mailService = require('../mail/mail.service');
const bcrypt = require('bcryptjs');

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
    async postBidderRequest(req, res, next) {
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
                const rating = r.rating >= 0 ? (r.rating * 100).toFixed(0) + '%' : 'Chưa có đánh giá';
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
                const rating = r.rating >= 0 ? (r.rating * 100).toFixed(0) + '%' : 'N/A';
                return {
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    rating: rating,
                    approvedDate: new Date(r.approved_at).toLocaleString('vi-VN'),
                    approvedBy: 'Admin'
                };
            });

            // Format rejected requests
            const formattedRejected = rejectedRequests.map(r => {
                const rating = r.rating >= 0 ? (r.rating * 100).toFixed(0) + '%' : 'N/A';
                return {
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    rating: rating,
                    rejectedDate: new Date(r.rejected_at).toLocaleString('vi-VN'),
                    rejectedBy: 'Admin'
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

            console.log(`[Admin] Approving request ${id} by admin ${adminId}`);

            // Approve request và lấy user_id
            const result = await bidderRequestModel.approve(id, adminId);

            if (!result) {
                console.warn(`[Admin] Request ${id} not found or already processed`);
                req.flash('error_msg', 'Không tìm thấy yêu cầu hoặc đã được xử lý!');
                return res.redirect('/admin/bidder-requests');
            }

            console.log(`[Admin] Request approved. Upgrading user ${result.user_id} to SELLER`);

            // Cập nhật role user thành SELLER
            const updatedUser = await userModel.updateRole(result.user_id, 'SELLER');

            if (!updatedUser) {
                console.error(`[Admin] Failed to update user ${result.user_id} role. User might not exist.`);
                throw new Error('Không thể cập nhật quyền cho người dùng (User ID không tồn tại?)');
            }

            console.log(`[Admin] User ${result.user_id} upgraded successfully. New Role: ${updatedUser.role}`);

            req.flash('success_msg', 'Đã duyệt yêu cầu thành công!');
            res.redirect('/admin/bidder-requests');
        } catch (error) {
            console.error('[Admin] Error approving bidder request:', error);
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
            const db = require('../configs/db');
            const { search, role, status } = req.query;

            // Build query với điều kiện lọc
            let conditions = [];
            let params = [];
            let paramIndex = 1;

            if (search) {
                conditions.push(`(LOWER(name) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex})`);
                params.push(`%${search.toLowerCase()}%`);
                paramIndex++;
            }

            if (role) {
                conditions.push(`role = $${paramIndex}`);
                params.push(role);
                paramIndex++;
            }

            if (status) {
                conditions.push(`status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }

            const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

            // Lấy dữ liệu thật từ database
            const query = `
                SELECT 
                    id, 
                    name, 
                    email, 
                    role, 
                    status,
                    created_at,
                    -- Tính rating theo role (dạng phần trăm)
                    CASE 
                        WHEN role = 'SELLER' THEN seller_average_rating * 100
                        WHEN role = 'BIDDER' THEN bidder_average_rating * 100
                        ELSE NULL
                    END as rating
                FROM users
                ${whereClause}
                ORDER BY created_at DESC
            `;

            const result = await db.query(query, params);

            // Format data cho view
            const users = result.rows.map(u => ({
                id: u.id,
                name: u.name,
                nameInitial: u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
                email: u.email,
                role: u.role,
                status: u.status,
                rating: u.rating != null ? parseFloat(u.rating).toFixed(0) + '%' : 'N/A',
                createdAt: new Date(u.created_at).toISOString().split('T')[0]
            }));

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
    },

    // Xóa người dùng
    async deleteUser(req, res, next) {
        try {
            const { id } = req.params;

            // Kiểm tra user có tồn tại không
            const user = await userModel.findById(id);
            if (!user) {
                return res.redirect('/admin/users?error=' + encodeURIComponent('Không tìm thấy người dùng!'));
            }

            // Không cho phép xóa chính mình
            if (req.user && req.user.id == id) {
                return res.redirect('/admin/users?error=' + encodeURIComponent('Không thể xóa tài khoản của chính bạn!'));
            }

            // Xóa user
            await userModel.deleteUser(id);

            res.redirect('/admin/users?success=' + encodeURIComponent('Đã xóa người dùng thành công!'));
        } catch (error) {
            console.error('Error deleting user:', error);
            
            // Kiểm tra lỗi foreign key constraint
            if (error.code === '23503') {
                return res.redirect('/admin/users?error=' + encodeURIComponent('Không thể xóa người dùng này do còn dữ liệu liên quan (sản phẩm, giao dịch, ...)'));
            }
            
            res.redirect('/admin/users?error=' + encodeURIComponent(error.message));
        }
    },

    // Reset mật khẩu người dùng
    async resetUserPassword(req, res, next) {
        try {
            const { id } = req.params;

            // Tìm user
            const user = await userModel.findById(id);
            if (!user) {
                return res.redirect('/admin/users?error=' + encodeURIComponent('Không tìm thấy người dùng!'));
            }

            // Tạo mật khẩu mới ngẫu nhiên (8 ký tự)
            const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase();
            
            // Hash mật khẩu
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Cập nhật mật khẩu trong database
            await userModel.resetPassword(id, hashedPassword);

            // Gửi email thông báo cho user
            const loginUrl = `${req.protocol}://${req.get('host')}/auth/login`;
            await mailService.sendPasswordResetEmail({
                to: user.email,
                userName: user.name,
                newPassword: newPassword,
                loginUrl: loginUrl
            });

            res.redirect('/admin/users?success=' + encodeURIComponent('Đã reset mật khẩu và gửi email thông báo thành công!'));
        } catch (error) {
            console.error('Error resetting user password:', error);
            res.redirect('/admin/users?error=' + encodeURIComponent('Có lỗi xảy ra khi reset mật khẩu: ' + error.message));
        }
    },

    // Settings Management
    async getSettings(req, res, next) {
        try {
            // Fetch current settings from database
            const { rows } = await db.query('SELECT key, value FROM system_settings');
            const settings = {};
            rows.forEach(row => {
                settings[row.key] = row.value;
            });

            // Set defaults if not exists
            if (!settings.auto_extend_minutes) {
                settings.auto_extend_minutes = '5';
            }

            res.render('admin/settings', {
                settings,
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg'),
                isAuth: req.isAuthenticated(),
                authUser: req.user
            });
        } catch (error) {
            console.error('Error loading settings:', error);
            next(error);
        }
    },

    async updateSettings(req, res, next) {
        try {
            const { auto_extend_minutes } = req.body;

            // Validate
            const minutes = parseInt(auto_extend_minutes);
            if (isNaN(minutes) || minutes < 1 || minutes > 60) {
                req.flash('error_msg', 'Thời gian gia hạn phải từ 1 đến 60 phút');
                return res.redirect('/admin/settings');
            }

            // Update or insert setting
            await db.query(`
                INSERT INTO system_settings (key, value, description, updated_at)
                VALUES ('auto_extend_minutes', $1, 'Thời gian gia hạn tự động cho đấu giá (phút)', NOW())
                ON CONFLICT (key) 
                DO UPDATE SET value = $1, updated_at = NOW()
            `, [minutes.toString()]);

            req.flash('success_msg', 'Đã cập nhật cài đặt thành công!');
            res.redirect('/admin/settings');
        } catch (error) {
            console.error('Error updating settings:', error);
            req.flash('error_msg', 'Có lỗi xảy ra: ' + error.message);
            res.redirect('/admin/settings');
        }
    }
};
