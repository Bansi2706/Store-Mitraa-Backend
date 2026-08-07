const reportsGetQueries = {
  // revenue, profit, paid amount, receivables, invoice count, active customers - ek hi query mein
  getInvoiceSummary: `
SELECT
    IFNULL(SUM(i.total_amount), 0) AS revenue,
    IFNULL(SUM(i.total_amount - cost.total_cost), 0) AS profit,
    IFNULL(SUM(i.paid_amount), 0) AS paid_amount,
    IFNULL(SUM(i.remaining_amount), 0) AS receivables,
    COUNT(*) AS invoice_count,
    COUNT(DISTINCT i.customer_id) AS active_customers
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

  getTotalExpenses: `
SELECT IFNULL(SUM(amount), 0) AS total
FROM expenses
WHERE owner_id = ?
`,

  getOutstandingPayables: `
SELECT IFNULL(SUM(remaining_amount), 0) AS total
FROM vendor_bills
WHERE owner_id = ?
`,

  getTotalCustomers: `
SELECT COUNT(*) AS total
FROM customers
WHERE owner_id = ?
`,

  // ===== SALES-PROFIT REPORT (period-wise) =====

  // WEEKLY: current week (Mon-Sun), grouped by weekday
  getInvoiceStatsByWeekday: `
SELECT
    WEEKDAY(i.created_at) AS bucket,
    SUM(i.total_amount) AS revenue,
    SUM(i.total_amount - cost.total_cost) AS profit,
    SUM(i.paid_amount) AS collections,
    SUM(i.remaining_amount) AS outstanding
FROM invoices i
LEFT JOIN (
    SELECT invoice_id, SUM(buying_price * quantity) AS total_cost
    FROM invoice_items
    GROUP BY invoice_id
) cost ON cost.invoice_id = i.id
WHERE i.owner_id = ?
AND YEARWEEK(i.created_at, 1) = YEARWEEK(CURDATE(), 1)
GROUP BY WEEKDAY(i.created_at)
`,

  getExpenseStatsByWeekday: `
SELECT
    WEEKDAY(expense_date) AS bucket,
    SUM(amount) AS total
FROM expenses
WHERE owner_id = ?
AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1)
GROUP BY WEEKDAY(expense_date)
`,

  // MONTHLY: current month, grouped by day-of-month (controller buckets into W1-W5)
  getInvoiceStatsByDayOfMonth: `
SELECT
    DAY(i.created_at) AS bucket,
    SUM(i.total_amount) AS revenue,
    SUM(i.total_amount - cost.total_cost) AS profit,
    SUM(i.paid_amount) AS collections,
    SUM(i.remaining_amount) AS outstanding
FROM invoices i
LEFT JOIN (
    SELECT invoice_id, SUM(buying_price * quantity) AS total_cost
    FROM invoice_items
    GROUP BY invoice_id
) cost ON cost.invoice_id = i.id
WHERE i.owner_id = ?
AND YEAR(i.created_at) = YEAR(CURDATE())
AND MONTH(i.created_at) = MONTH(CURDATE())
GROUP BY DAY(i.created_at)
`,

  getExpenseStatsByDayOfMonth: `
SELECT
    DAY(expense_date) AS bucket,
    SUM(amount) AS total
FROM expenses
WHERE owner_id = ?
AND YEAR(expense_date) = YEAR(CURDATE())
AND MONTH(expense_date) = MONTH(CURDATE())
GROUP BY DAY(expense_date)
`,

  // QUARTERLY / YEARLY: month range within a year, grouped by month
  getInvoiceStatsByMonthRange: `
SELECT
    MONTH(i.created_at) AS bucket,
    SUM(i.total_amount) AS revenue,
    SUM(i.total_amount - cost.total_cost) AS profit,
    SUM(i.paid_amount) AS collections,
    SUM(i.remaining_amount) AS outstanding
FROM invoices i
LEFT JOIN (
    SELECT invoice_id, SUM(buying_price * quantity) AS total_cost
    FROM invoice_items
    GROUP BY invoice_id
) cost ON cost.invoice_id = i.id
WHERE i.owner_id = ?
AND YEAR(i.created_at) = ?
AND MONTH(i.created_at) BETWEEN ? AND ?
GROUP BY MONTH(i.created_at)
`,

  getExpenseStatsByMonthRange: `
SELECT
    MONTH(expense_date) AS bucket,
    SUM(amount) AS total
FROM expenses
WHERE owner_id = ?
AND YEAR(expense_date) = ?
AND MONTH(expense_date) BETWEEN ? AND ?
GROUP BY MONTH(expense_date)
`,

};

  // ===== CASHFLOW REPORT (period-wise, lighter query - no cost join, revenue/profit not needed) =====

reportsGetQueries.getInvoiceCashByWeekday = `
SELECT
    WEEKDAY(created_at) AS bucket,
    SUM(paid_amount) AS collections,
    SUM(remaining_amount) AS outstanding
FROM invoices
WHERE owner_id = ?
AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
GROUP BY WEEKDAY(created_at)
`;

reportsGetQueries.getInvoiceCashByDayOfMonth = `
SELECT
    DAY(created_at) AS bucket,
    SUM(paid_amount) AS collections,
    SUM(remaining_amount) AS outstanding
FROM invoices
WHERE owner_id = ?
AND YEAR(created_at) = YEAR(CURDATE())
AND MONTH(created_at) = MONTH(CURDATE())
GROUP BY DAY(created_at)
`;

reportsGetQueries.getInvoiceCashByMonthRange = `
SELECT
    MONTH(created_at) AS bucket,
    SUM(paid_amount) AS collections,
    SUM(remaining_amount) AS outstanding
FROM invoices
WHERE owner_id = ?
AND YEAR(created_at) = ?
AND MONTH(created_at) BETWEEN ? AND ?
GROUP BY MONTH(created_at)
`;

// ===== CATEGORY PERFORMANCE (base query, controller appends period-wise date filter) =====

reportsGetQueries.getCategoryPerformanceBase = `
SELECT
    p.product_category AS category,
    SUM(ii.line_total) AS revenue,
    SUM(ii.line_total - (ii.buying_price * ii.quantity)) AS profit,
    SUM(ii.quantity) AS quantity,
    COUNT(DISTINCT ii.invoice_id) AS orders
FROM invoice_items ii
INNER JOIN invoices i ON i.id = ii.invoice_id
INNER JOIN products p ON p.id = ii.product_id
WHERE i.owner_id = ?
`;

// ===== CUSTOMER INSIGHTS (new vs repeat customers) =====
// ek customer "new" tab hota hai jab yeh unka bilkul pehla invoice ever ho (id = MIN(id) grouped by customer_id)
// warna "repeat" customer hai
 
reportsGetQueries.getCustomerStatsByWeekday = `
SELECT
    WEEKDAY(i.created_at) AS bucket,
    SUM(CASE WHEN i.id = fc.first_invoice_id THEN 1 ELSE 0 END) AS new_customers,
    COUNT(DISTINCT CASE WHEN i.id != fc.first_invoice_id THEN i.customer_id END) AS repeat_customers,
    SUM(CASE WHEN i.id != fc.first_invoice_id THEN i.total_amount ELSE 0 END) AS repeat_revenue
FROM invoices i
INNER JOIN (
    SELECT customer_id, MIN(id) AS first_invoice_id
    FROM invoices
    WHERE owner_id = ?
    GROUP BY customer_id
) fc ON fc.customer_id = i.customer_id
WHERE i.owner_id = ?
AND YEARWEEK(i.created_at, 1) = YEARWEEK(CURDATE(), 1)
GROUP BY WEEKDAY(i.created_at)
`;
 
reportsGetQueries.getCustomerTotalsWeekly = `
SELECT
    SUM(CASE WHEN i.id = fc.first_invoice_id THEN 1 ELSE 0 END) AS total_new_customers,
    COUNT(DISTINCT CASE WHEN i.id != fc.first_invoice_id THEN i.customer_id END) AS total_repeat_customers,
    SUM(CASE WHEN i.id != fc.first_invoice_id THEN i.total_amount ELSE 0 END) AS repeat_revenue
FROM invoices i
INNER JOIN (
    SELECT customer_id, MIN(id) AS first_invoice_id
    FROM invoices
    WHERE owner_id = ?
    GROUP BY customer_id
) fc ON fc.customer_id = i.customer_id
WHERE i.owner_id = ?
AND YEARWEEK(i.created_at, 1) = YEARWEEK(CURDATE(), 1)
`;
 
reportsGetQueries.getCustomerStatsByDayOfMonth = `
SELECT
    DAY(i.created_at) AS bucket,
    SUM(CASE WHEN i.id = fc.first_invoice_id THEN 1 ELSE 0 END) AS new_customers,
    COUNT(DISTINCT CASE WHEN i.id != fc.first_invoice_id THEN i.customer_id END) AS repeat_customers,
    SUM(CASE WHEN i.id != fc.first_invoice_id THEN i.total_amount ELSE 0 END) AS repeat_revenue
FROM invoices i
INNER JOIN (
    SELECT customer_id, MIN(id) AS first_invoice_id
    FROM invoices
    WHERE owner_id = ?
    GROUP BY customer_id
) fc ON fc.customer_id = i.customer_id
WHERE i.owner_id = ?
AND YEAR(i.created_at) = YEAR(CURDATE())
AND MONTH(i.created_at) = MONTH(CURDATE())
GROUP BY DAY(i.created_at)
`;
 
reportsGetQueries.getCustomerTotalsMonthly = `
SELECT
    SUM(CASE WHEN i.id = fc.first_invoice_id THEN 1 ELSE 0 END) AS total_new_customers,
    COUNT(DISTINCT CASE WHEN i.id != fc.first_invoice_id THEN i.customer_id END) AS total_repeat_customers,
    SUM(CASE WHEN i.id != fc.first_invoice_id THEN i.total_amount ELSE 0 END) AS repeat_revenue
FROM invoices i
INNER JOIN (
    SELECT customer_id, MIN(id) AS first_invoice_id
    FROM invoices
    WHERE owner_id = ?
    GROUP BY customer_id
) fc ON fc.customer_id = i.customer_id
WHERE i.owner_id = ?
AND YEAR(i.created_at) = YEAR(CURDATE())
AND MONTH(i.created_at) = MONTH(CURDATE())
`;
 
reportsGetQueries.getCustomerStatsByMonthRange = `
SELECT
    MONTH(i.created_at) AS bucket,
    SUM(CASE WHEN i.id = fc.first_invoice_id THEN 1 ELSE 0 END) AS new_customers,
    COUNT(DISTINCT CASE WHEN i.id != fc.first_invoice_id THEN i.customer_id END) AS repeat_customers,
    SUM(CASE WHEN i.id != fc.first_invoice_id THEN i.total_amount ELSE 0 END) AS repeat_revenue
FROM invoices i
INNER JOIN (
    SELECT customer_id, MIN(id) AS first_invoice_id
    FROM invoices
    WHERE owner_id = ?
    GROUP BY customer_id
) fc ON fc.customer_id = i.customer_id
WHERE i.owner_id = ?
AND YEAR(i.created_at) = ?
AND MONTH(i.created_at) BETWEEN ? AND ?
GROUP BY MONTH(i.created_at)
`;
 
reportsGetQueries.getCustomerTotalsByMonthRange = `
SELECT
    SUM(CASE WHEN i.id = fc.first_invoice_id THEN 1 ELSE 0 END) AS total_new_customers,
    COUNT(DISTINCT CASE WHEN i.id != fc.first_invoice_id THEN i.customer_id END) AS total_repeat_customers,
    SUM(CASE WHEN i.id != fc.first_invoice_id THEN i.total_amount ELSE 0 END) AS repeat_revenue
FROM invoices i
INNER JOIN (
    SELECT customer_id, MIN(id) AS first_invoice_id
    FROM invoices
    WHERE owner_id = ?
    GROUP BY customer_id
) fc ON fc.customer_id = i.customer_id
WHERE i.owner_id = ?
AND YEAR(i.created_at) = ?
AND MONTH(i.created_at) BETWEEN ? AND ?
`;

// ===== PAYMENT INSIGHTS (collection exposure by status) =====
// OVERDUE = Pending invoices jo 15+ din purani hain (koi due_date column nahi hai invoices table mein,
// isliye created_at se age nikaal ke fixed 15-din threshold use kiya hai - adjustable)
 
reportsGetQueries.getPaymentInsightsWeekly = `
SELECT
    SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) AS paid_count,
    SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS paid_amount,
 
    SUM(CASE WHEN payment_status = 'Partial' THEN 1 ELSE 0 END) AS partial_count,
    SUM(CASE WHEN payment_status = 'Partial' THEN total_amount ELSE 0 END) AS partial_amount,
 
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) <= 15 THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) <= 15 THEN total_amount ELSE 0 END) AS pending_amount,
 
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN 1 ELSE 0 END) AS overdue_count,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN total_amount ELSE 0 END) AS overdue_amount,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN remaining_amount ELSE 0 END) AS overdue_remaining,
 
    SUM(paid_amount) AS collected_amount,
    SUM(remaining_amount) AS outstanding_amount
FROM invoices
WHERE owner_id = ?
AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
`;
 
reportsGetQueries.getPaymentInsightsMonthly = `
SELECT
    SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) AS paid_count,
    SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS paid_amount,
 
    SUM(CASE WHEN payment_status = 'Partial' THEN 1 ELSE 0 END) AS partial_count,
    SUM(CASE WHEN payment_status = 'Partial' THEN total_amount ELSE 0 END) AS partial_amount,
 
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) <= 15 THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) <= 15 THEN total_amount ELSE 0 END) AS pending_amount,
 
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN 1 ELSE 0 END) AS overdue_count,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN total_amount ELSE 0 END) AS overdue_amount,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN remaining_amount ELSE 0 END) AS overdue_remaining,
 
    SUM(paid_amount) AS collected_amount,
    SUM(remaining_amount) AS outstanding_amount
FROM invoices
WHERE owner_id = ?
AND YEAR(created_at) = YEAR(CURDATE())
AND MONTH(created_at) = MONTH(CURDATE())
`;
 
// quarterly aur yearly dono isi ko month-range parameters ke sath use karenge
reportsGetQueries.getPaymentInsightsByMonthRange = `
SELECT
    SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) AS paid_count,
    SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS paid_amount,
 
    SUM(CASE WHEN payment_status = 'Partial' THEN 1 ELSE 0 END) AS partial_count,
    SUM(CASE WHEN payment_status = 'Partial' THEN total_amount ELSE 0 END) AS partial_amount,
 
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) <= 15 THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) <= 15 THEN total_amount ELSE 0 END) AS pending_amount,
 
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN 1 ELSE 0 END) AS overdue_count,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN total_amount ELSE 0 END) AS overdue_amount,
    SUM(CASE WHEN payment_status = 'Pending' AND DATEDIFF(CURDATE(), created_at) > 15 THEN remaining_amount ELSE 0 END) AS overdue_remaining,
 
    SUM(paid_amount) AS collected_amount,
    SUM(remaining_amount) AS outstanding_amount
FROM invoices
WHERE owner_id = ?
AND YEAR(created_at) = ?
AND MONTH(created_at) BETWEEN ? AND ?
`; 

module.exports = reportsGetQueries;