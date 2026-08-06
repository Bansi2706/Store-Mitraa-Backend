const productPostQueries = {
  checkSku: `
    SELECT id
    FROM products
    WHERE product_sku = ?
  `,

  createProduct: `
    INSERT INTO products
    (
      owner_id,
      product_name,
      product_description,
      product_category,
      product_sku,
      buying_price,
      product_mrp,
      stock_quantity,
      low_stock_threshold,
      product_unit,
      product_image
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
};

module.exports = productPostQueries;