const productModel = require("../models/product.model") 
module.exports = {
    getFeed(req, res) {

        // const page = parseInt(req.query.page) || 1;
        // const limit = 9; // 9 sản phẩm mỗi trang
        
  
        
        // const totalProducts = allProducts.length;
        // const totalPages = Math.ceil(totalProducts / limit);
        // const startIndex = (page - 1) * limit;
        // const endIndex = startIndex + limit;
        
        // const products = allProducts.slice(startIndex, endIndex);

        // const pages =[];
        // for(let i = 1 ; i<= totalPages;i++){
        //     pages.push({
        //         value:i,
        //         isActive: i==page
        //     });
        // }

        
        // res.render('product/feed', {
        //     products,
        //     pagination:{
        //         pages: pages,
        //         currentPage:page,
        //         prevPage:page>1 ?  page - 1:null,
        //         nextPage:page<totalPages? page + 1:null,
        //         canGoPrev:page>1,
        //         canGoNext:page<totalPages
        //     }
        // });
    },
    async getAllProduct(req,res){
        // const products= await productModel.listAllProducts()
        
        const products =await productModel.listAllProducts()
        console.log('products ne',products)
        res.render('home',{
        products
        })
    },
    async searchProduct(req,res){
        const search = req.query.q||null
        console.log('search ne', search)
        const products = await productModel.search(search)
        console.log('products ne',products)
        res.render('home',{
        products
        })
    },
    async getProductDetail(req,res){
        const id = req.params.id
        const product= await productModel.getProductById(id)
        console.log('products ne',product)
        res.render('product/detail',{
            product
        })
    },
};
