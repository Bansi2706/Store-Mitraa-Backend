const productDeleteQueries = {
  getProductImages: `
    SELECT image_url
    FROM product_images
    WHERE product_id = ?
  `,

  deleteProduct: `
    DELETE
    FROM products
    WHERE id = ? AND owner_id = ?
  `
};

module.exports = productDeleteQueries;