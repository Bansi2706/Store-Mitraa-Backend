const productGetQueries = {
  getAllProducts: `
  SELECT
    *,
    CASE
      WHEN stock_quantity = 0 THEN 'Out of Stock'
      WHEN stock_quantity <= low_stock_threshold THEN 'Low Stock'
      ELSE 'In Stock'
    END AS stock_status

  FROM products

  WHERE owner_id = ?

  ORDER BY id DESC
  LIMIT ? OFFSET ?
`,

  getProductsCount: `
    SELECT COUNT(*) AS total
    FROM products
    WHERE owner_id = ?
  `,

  getProductById: `
    SELECT *
    FROM products
    WHERE id = ? AND owner_id = ?
  `,

  getProductImages: `
    SELECT
      id,
      image_url,
      is_main,
      display_order
    FROM product_images
    WHERE product_id = ?
    ORDER BY display_order ASC
  `,

 searchProducts: `
SELECT
    id,
    product_name,
    product_sku,

    product_mrp,
    buying_price,

    stock_quantity,
    product_unit,
    product_image,

    -- Default Input Values
    1 AS default_quantity,

    0 AS default_discount_percentage,

    product_mrp AS default_unit_price,

    -- Default Display Values
    ROUND((product_mrp * 0) / 100, 2) AS default_discount_amount,

    ROUND(product_mrp, 2) AS default_total,

    ROUND(product_mrp - buying_price, 2) AS default_profit

FROM products

WHERE owner_id = ?
AND (
    product_name LIKE ?
    OR product_sku LIKE ?
)

ORDER BY product_name ASC
LIMIT 10
`,

  getProductDashboard: `
SELECT
    COUNT(*) AS total_items,

    SUM(
        CASE
            WHEN stock_quantity = 0 THEN 1
            ELSE 0
        END
    ) AS out_of_stock,

    SUM(
        stock_quantity * product_mrp
    ) AS inventory_value,

    SUM(
        CASE
            WHEN stock_quantity > 0
            AND stock_quantity <= low_stock_threshold
            THEN 1
            ELSE 0
        END
    ) AS low_stock_alerts

FROM products

WHERE owner_id = ?
`,
};

module.exports = productGetQueries;