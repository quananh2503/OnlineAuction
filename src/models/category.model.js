const db = require('../configs/db');

module.exports = {
    // Lấy tất cả categories (cấp 1 và cấp 2)
    async getAll() {
        const sql = `
            SELECT c1.id, c1.name, c1.parent_id,
                   c2.name as parent_name
            FROM categories c1
            LEFT JOIN categories c2 ON c1.parent_id = c2.id
            ORDER BY COALESCE(c1.parent_id, c1.id), c1.parent_id NULLS FIRST, c1.name
        `;
        const result = await db.query(sql);
        return result.rows;
    },

    // Lấy chỉ categories cấp 1 (parent_id = NULL)
    async getParentCategories() {
        const sql = `
            SELECT id, name
            FROM categories
            WHERE parent_id IS NULL
            ORDER BY name
        `;
        const result = await db.query(sql);
        return result.rows;
    },
    async getSubCategories() {
        const sql = `
            SELECT id, name
            FROM categories
            WHERE parent_id IS NOT NULL
            ORDER BY name
        `;
        const result = await db.query(sql);
        return result.rows;
    },

    // Lấy categories con của một parent
    async getChildCategories(parentId) {
        const sql = `
            SELECT id, name, parent_id
            FROM categories
            WHERE parent_id = $1
            ORDER BY name
        `;
        const result = await db.query(sql, [parentId]);
        return result.rows;
    },



    // Lấy category theo ID
    async getById(id) {
        const sql = `
            SELECT c1.id, c1.name, c1.parent_id,
                   c2.name as parent_name
            FROM categories c1
            LEFT JOIN categories c2 ON c1.parent_id = c2.id
            WHERE c1.id = $1
        `;
        const result = await db.query(sql, [id]);
        return result.rows[0];
    },

    // Tạo category mới
    async create(name, parentId = null) {
        const sql = `
            INSERT INTO categories (name, parent_id)
            VALUES ($1, $2)
            RETURNING *
        `;
        const result = await db.query(sql, [name, parentId]);
        return result.rows[0];
    },

    // Cập nhật category
    async update(id, name, parentId = null) {
        // Không cho phép set parent_id = chính nó hoặc con của nó
        if (parentId) {
            const child = await this.getById(parentId);
            if (child && child.parent_id == id) {
                throw new Error('Không thể đặt category con làm parent!');
            }
        }

        const sql = `
            UPDATE categories
            SET name = $1, parent_id = $2
            WHERE id = $3
            RETURNING *
        `;
        const result = await db.query(sql, [name, parentId, id]);
        return result.rows[0];
    },

    // Xóa category
    async delete(id) {
        // Kiểm tra xem có category con không
        const children = await this.getChildCategories(id);
        if (children.length > 0) {
            throw new Error('Không thể xóa category có danh mục con! Vui lòng xóa các danh mục con trước.');
        }

        // Kiểm tra xem có sản phẩm nào đang dùng category này không
        const productCheck = await db.query(
            'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
            [id]
        );

        if (parseInt(productCheck.rows[0].count) > 0) {
            throw new Error('Không thể xóa category đang được sử dụng bởi sản phẩm!');
        }

        const sql = 'DELETE FROM categories WHERE id = $1 RETURNING *';
        const result = await db.query(sql, [id]);
        return result.rows[0];
    },

    // Kiểm tra tên category có trùng không
    async checkDuplicate(name, parentId = null, excludeId = null) {
        let sql = `
            SELECT id FROM categories
            WHERE LOWER(name) = LOWER($1)
            AND parent_id IS NOT DISTINCT FROM $2
        `;
        const params = [name, parentId];

        if (excludeId) {
            sql += ' AND id != $3';
            params.push(excludeId);
        }

        const result = await db.query(sql, params);
        return result.rows.length > 0;
    },

    // Lấy cây danh mục (nested)
    async getTree() {
        const sql = `
            SELECT id, name, parent_id
            FROM categories
            ORDER BY parent_id NULLS FIRST, name
        `;
        const result = await db.query(sql);
        const categories = result.rows;

        const map = {};
        const roots = [];

        // Tạo map
        categories.forEach(c => {
            map[c.id] = { ...c, children: [] };
        });

        // Xây dựng cây
        categories.forEach(c => {
            if (c.parent_id) {
                if (map[c.parent_id]) {
                    map[c.parent_id].children.push(map[c.id]);
                }
            } else {
                roots.push(map[c.id]);
            }
        });

        return roots;
    }
};
