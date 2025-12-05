const categoryModel = require('../models/category.model');

module.exports = async function (req, res, next) {
    try {
        const categories = await categoryModel.getTree();
        res.locals.layoutCategories = categories;
        next();
    } catch (error) {
        console.error('Error fetching categories for layout:', error);
        next();
    }
};
