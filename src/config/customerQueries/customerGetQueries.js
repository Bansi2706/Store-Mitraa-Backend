const customerGetQueries = {
  getAllCustomers: `
SELECT
    c.id,
    c.owner_id,

    c.first_name,
    c.last_name,
    c.phone_number,
    c.email,

    c.city,
    c.state,
    c.pincode,
    c.gst_number,
    c.address,

    c.status,

    c.created_at,
    c.updated_at,

    COUNT(DISTINCT i.id) AS total_orders,

    IFNULL(SUM(i.total_amount), 0) AS revenue,

    IFNULL(SUM(i.remaining_amount), 0) AS outstanding,

    MAX(i.created_at) AS last_bill

FROM customers c

LEFT JOIN invoices i
    ON c.id = i.customer_id

WHERE c.owner_id = ?

GROUP BY
    c.id,
    c.owner_id,
    c.first_name,
    c.last_name,
    c.phone_number,
    c.email,
    c.city,
    c.state,
    c.pincode,
    c.gst_number,
    c.address,
    c.status,
    c.created_at,
    c.updated_at

ORDER BY c.created_at DESC
LIMIT ? OFFSET ?
`,

  getCustomersCount: `
    SELECT COUNT(*) AS total
    FROM customers
    WHERE owner_id = ?
  `,

  getCustomerById: `
    SELECT *
    FROM customers
    WHERE id = ?
    AND owner_id = ?
  `,

  searchCustomers: `
    SELECT *
    FROM customers
    WHERE owner_id = ?
    AND (
      first_name LIKE ?
      OR last_name LIKE ?
      OR phone_number LIKE ?
      OR email LIKE ?
    )
    ORDER BY first_name ASC
    LIMIT 10
  `,

  getCustomerDashboard: `
SELECT
(
    SELECT COUNT(*)
    FROM customers
    WHERE owner_id = ?
) AS total_customers,

(
    SELECT COUNT(*)
    FROM customers
    WHERE owner_id = ?
      AND status = 'ACTIVE'
) AS active_customers,

(
    SELECT IFNULL(SUM(total_amount), 0)
    FROM invoices
    WHERE owner_id = ?
) AS customer_revenue,

(
    SELECT ROUND(
        (
            COUNT(*) /
            NULLIF(
                (
                    SELECT COUNT(*)
                    FROM customers
                    WHERE owner_id = ?
                ),
                0
            )
        ) * 100,
        2
    )
    FROM (
        SELECT customer_id
        FROM invoices
        WHERE owner_id = ?
        GROUP BY customer_id
        HAVING COUNT(*) > 1
    ) repeat_customers
) AS repeat_rate
`,

getRevenueTrend: `
SELECT
    DATE_FORMAT(created_at, '%b %y') AS month,
    SUM(total_amount) AS sales,
    SUM(paid_amount) AS paid
FROM invoices

WHERE owner_id = ?
  AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)

GROUP BY
    YEAR(created_at),
    MONTH(created_at)
ORDER BY
    YEAR(created_at),
    MONTH(created_at)
`,

getGrowthMix: `
SELECT
    DATE_FORMAT(i.created_at, '%b %y') AS month,

    SUM(
        CASE
            WHEN i.created_at = (
                SELECT MIN(created_at)
                FROM invoices
                WHERE customer_id = i.customer_id
            )
            THEN 1
            ELSE 0
        END
    ) AS new_customers,

    SUM(
        CASE
            WHEN i.created_at > (
                SELECT MIN(created_at)
                FROM invoices
                WHERE customer_id = i.customer_id
            )
            THEN 1
            ELSE 0
        END
    ) AS returning_customers,

    COUNT(DISTINCT i.customer_id) AS total_customers

FROM invoices i

WHERE i.owner_id = ?
  AND i.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)

GROUP BY
    YEAR(i.created_at),
    MONTH(i.created_at)

ORDER BY
    YEAR(i.created_at),
    MONTH(i.created_at)
`,

filterCustomers: `
SELECT
    c.*,

    COUNT(i.id) AS total_orders,

    IFNULL(SUM(i.total_amount), 0) AS total_spent,

    IFNULL(SUM(i.remaining_amount), 0) AS outstanding_amount,

    MAX(i.created_at) AS last_invoice_date

FROM customers c

LEFT JOIN invoices i
ON c.id = i.customer_id

WHERE c.owner_id = ?

GROUP BY c.id
`,

getTopCustomers: `
SELECT
    c.id,
    c.first_name,
    c.last_name,
    c.status,

    COUNT(DISTINCT i.id) AS total_orders,

    IFNULL(SUM(i.total_amount), 0) AS revenue,

    IFNULL(SUM(i.remaining_amount), 0) AS outstanding

FROM customers c

LEFT JOIN invoices i
ON c.id = i.customer_id

WHERE c.owner_id = ?

GROUP BY c.id

ORDER BY revenue DESC

LIMIT 4
`,

 getCustomerBase: `
    SELECT
      id AS customer_id,
      first_name,
      last_name,
      phone_number AS phone,
      email,
      address,
      city,
      state,
      pincode,
      gst_number,
      status
    FROM customers
    WHERE id = ? AND owner_id = ?
  `,

   getInvoiceSummary: `
    SELECT
      COUNT(*) AS total_orders,
      IFNULL(SUM(total_amount), 0) AS total_spent,
      IFNULL(SUM(remaining_amount), 0) AS outstanding_amount,
      MIN(created_at) AS first_invoice_date,
      MAX(created_at) AS last_invoice_date
    FROM invoices
    WHERE customer_id = ? AND owner_id = ?
  `,

  getTotalProfit: `
    SELECT
      IFNULL(SUM(ii.line_total - (ii.buying_price * ii.quantity)), 0) AS total_profit
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.customer_id = ? AND i.owner_id = ?
  `,

  getCustomerInvoices: `
    SELECT
      i.id AS invoice_id,
      i.invoice_number,
      i.created_at AS invoice_date,
      i.total_amount AS final_amount,
      i.paid_amount,
      i.remaining_amount,
      IFNULL(SUM(ii.line_total - (ii.buying_price * ii.quantity)), 0) AS total_profit,
      LOWER(i.payment_status) AS payment_status
    FROM invoices i
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE i.customer_id = ? AND i.owner_id = ?
    GROUP BY
      i.id, i.invoice_number, i.created_at,
      i.total_amount, i.paid_amount, i.remaining_amount, i.payment_status
    ORDER BY i.created_at DESC
  `,

  getCustomerProducts: `
    SELECT
      p.id AS product_id,
      p.product_sku AS product_code,
      p.product_name,
      p.product_category AS category,
      SUM(ii.quantity) AS total_quantity,
      SUM(ii.line_total) AS total_sales,
      SUM(ii.line_total - (ii.buying_price * ii.quantity)) AS total_profit
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    JOIN products p ON p.id = ii.product_id
    WHERE i.customer_id = ? AND i.owner_id = ?
    GROUP BY p.id, p.product_sku, p.product_name, p.product_category
    ORDER BY total_sales DESC
  `,


  getSpendTrendRaw: `
    SELECT
      DATE_FORMAT(created_at, '%Y-%m') AS month_key,
      SUM(total_amount) AS total_spend,
      SUM(paid_amount) AS collected_amount
    FROM invoices
    WHERE customer_id = ? AND owner_id = ?
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY YEAR(created_at), MONTH(created_at)
    ORDER BY YEAR(created_at), MONTH(created_at)
  `,

};

module.exports = customerGetQueries;