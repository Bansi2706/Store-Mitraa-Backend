const dashboardGetQueries = {
  getOwnerName: `
SELECT owner_name
FROM owners
WHERE id = ?
`,

  // ===== SALES (today / yesterday / this week / last week) =====

  getTodaySales: `
SELECT IFNULL(SUM(total_amount), 0) AS total
FROM invoices
WHERE owner_id = ?
AND DATE(created_at) = CURDATE()
`,

  getYesterdaySales: `
SELECT IFNULL(SUM(total_amount), 0) AS total
FROM invoices
WHERE owner_id = ?
AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
`,

  getThisWeekSales: `
SELECT IFNULL(SUM(total_amount), 0) AS total
FROM invoices
WHERE owner_id = ?
AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
`,

  getLastWeekSales: `
SELECT IFNULL(SUM(total_amount), 0) AS total
FROM invoices
WHERE owner_id = ?
AND YEARWEEK(created_at, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)
`,

  // ===== REVENUE / PROFIT (all-time totals, shown as REVENUE / PROFIT cards) =====

  getAllTimeRevenueProfit: `
SELECT
    IFNULL(SUM(i.total_amount), 0) AS revenue,
    IFNULL(SUM(i.total_amount - cost.total_cost), 0) AS profit
FROM invoices i
LEFT JOIN (
    SELECT
        invoice_id,
        SUM(buying_price * quantity) AS total_cost
    FROM invoice_items
    GROUP BY invoice_id
) cost ON cost.invoice_id = i.id
WHERE i.owner_id = ?
`,

  // this month / last month revenue+profit, used only to compute the "change %" on the cards
  getMonthRevenueProfit: `
SELECT
    IFNULL(SUM(i.total_amount), 0) AS revenue,
    IFNULL(SUM(i.total_amount - cost.total_cost), 0) AS profit
FROM invoices i
LEFT JOIN (
    SELECT
        invoice_id,
        SUM(buying_price * quantity) AS total_cost
    FROM invoice_items
    GROUP BY invoice_id
) cost ON cost.invoice_id = i.id
WHERE i.owner_id = ?
AND YEAR(i.created_at) = ?
AND MONTH(i.created_at) = ?
`,

  // ===== LOW STOCK =====

  getLowStockCount: `
SELECT COUNT(*) AS count
FROM products
WHERE owner_id = ?
AND stock_quantity <= low_stock_threshold
`,

  getLowStockProducts: `
SELECT
    id,
    product_name AS name,
    product_sku AS sku,
    stock_quantity AS \`left\`,
    product_image AS image
FROM products
WHERE owner_id = ?
AND stock_quantity <= low_stock_threshold
ORDER BY stock_quantity ASC, id ASC
LIMIT 5
`,

  // ===== SALES TRENDS (last 7 days, day-wise) =====

  getSalesTrendLast7Days: `
SELECT
    DATE(created_at) AS sale_date,
    SUM(total_amount) AS total
FROM invoices
WHERE owner_id = ?
AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
GROUP BY DATE(created_at)
ORDER BY sale_date ASC
`,

  // ===== REVENUE VS PROFIT (quarter-wise, current year) =====

  getRevenueProfitByQuarter: `
SELECT
    QUARTER(i.created_at) AS quarter,
    IFNULL(SUM(i.total_amount), 0) AS revenue,
    IFNULL(SUM(i.total_amount - cost.total_cost), 0) AS profit
FROM invoices i
LEFT JOIN (
    SELECT
        invoice_id,
        SUM(buying_price * quantity) AS total_cost
    FROM invoice_items
    GROUP BY invoice_id
) cost ON cost.invoice_id = i.id
WHERE i.owner_id = ?
AND YEAR(i.created_at) = YEAR(CURDATE())
GROUP BY QUARTER(i.created_at)
`,

  // ===== RECENT BILLS =====

  getRecentBills: `
SELECT
    invoice_number,
    created_at,
    total_amount,
    payment_status
FROM invoices
WHERE owner_id = ?
ORDER BY id DESC
LIMIT 6
`,
};

module.exports = dashboardGetQueries;