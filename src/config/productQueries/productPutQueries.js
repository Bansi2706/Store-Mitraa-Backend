const productPutQueries = {
  updateProduct: `
    UPDATE products
    SET
      product_name = ?,
      product_description = ?,
      product_category = ?,
      product_sku = ?,
      buying_price = ?,
      product_mrp = ?,
      stock_quantity = ?,
      low_stock_threshold = ?,
      product_unit = ?
    WHERE id = ? AND owner_id = ?
  `,

  getProductImages: `
    SELECT id, image_url
    FROM product_images
    WHERE product_id = ?
  `,

  deleteProductImage: `
    DELETE
    FROM product_images
    WHERE id = ?
    AND product_id = ?
    `,

  addProductImage: `
    INSERT INTO product_images
    (
      product_id,
      image_url,
      is_main,
      display_order
    )
    VALUES (?, ?, ?, ?)
  `,

  updateMainProductImage: `
    UPDATE products
    SET product_image = ?
    WHERE id = ?
  `,

  checkSkuExcludingSelf: `
    SELECT id
    FROM products
    WHERE product_sku = ?
    AND id != ?
    AND owner_id = ?
    `,

  resetMainImage: `
    UPDATE product_images
    SET is_main = 0
    WHERE product_id = ?
    `,

  setMainImage: `
    UPDATE product_images
    SET is_main = 1
    WHERE id = ?
    AND product_id = ?
    `,

  getImageById: `
    SELECT image_url
    FROM product_images
    WHERE id = ?
    AND product_id = ?
    `,
};

module.exports = productPutQueries;
