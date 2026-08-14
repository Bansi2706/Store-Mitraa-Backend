const expenseGetQueries = {
  getAllExpenses: `
SELECT
    id,
    owner_id,
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
    created_at,
    updated_at
FROM expenses
WHERE owner_id = ?
ORDER BY expense_date DESC, id DESC
LIMIT ? OFFSET ?
`,

  getExpensesCount: `
    SELECT COUNT(*) AS total
    FROM expenses
    WHERE owner_id = ?
  `,

  // ===== EXPENSE REGISTER SEARCH (base query, controller dynamically extends it) =====

  searchExpenses: `
SELECT
    id,
    owner_id,
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
    created_at,
    updated_at
FROM expenses
WHERE owner_id = ?
`,

  // ===== ALL EXPENSES LIST (range-wise) =====

  getAllExpensesAll: `
SELECT
    id,
    owner_id,
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
    created_at,
    updated_at
FROM expenses
WHERE owner_id = ?
ORDER BY expense_date DESC, id DESC
LIMIT ? OFFSET ?
`,

  getExpensesAllCount: `
    SELECT COUNT(*) AS total
    FROM expenses
    WHERE owner_id = ?
  `,

  getAllExpensesWeek: `
SELECT
    id,
    owner_id,
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
    created_at,
    updated_at
FROM expenses
WHERE owner_id = ?
AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1)
ORDER BY expense_date DESC, id DESC
LIMIT ? OFFSET ?
`,

  getExpensesWeekCount: `
    SELECT COUNT(*) AS total
    FROM expenses
    WHERE owner_id = ?
    AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1)
  `,

  getAllExpensesMonth: `
SELECT
    id,
    owner_id,
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
    created_at,
    updated_at
FROM expenses
WHERE owner_id = ?
AND YEAR(expense_date) = YEAR(CURDATE())
AND MONTH(expense_date) = MONTH(CURDATE())
ORDER BY expense_date DESC, id DESC
LIMIT ? OFFSET ?
`,

  getExpensesMonthCount: `
    SELECT COUNT(*) AS total
    FROM expenses
    WHERE owner_id = ?
    AND YEAR(expense_date) = YEAR(CURDATE())
    AND MONTH(expense_date) = MONTH(CURDATE())
  `,

getExpenseById: `
SELECT
    id,
    owner_id,
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
    created_at,
    updated_at
FROM expenses
WHERE id = ?
AND owner_id = ?
`,

  getExpenseSummary: `
SELECT
    COUNT(*) AS range_count,
 
    IFNULL(SUM(amount), 0) AS range_total,
 
    IFNULL(AVG(amount), 0) AS average_expense,
 
    (
        SELECT IFNULL(SUM(amount), 0)
        FROM expenses
        WHERE owner_id = ?
        AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1)
    ) AS weekly_total,
 
    (
        SELECT COUNT(*)
        FROM expenses
        WHERE owner_id = ?
        AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1)
    ) AS weekly_count,
 
    (
        SELECT IFNULL(SUM(amount), 0)
        FROM expenses
        WHERE owner_id = ?
        AND YEAR(expense_date) = YEAR(CURDATE())
        AND MONTH(expense_date) = MONTH(CURDATE())
    ) AS monthly_total,
 
    (
        SELECT COUNT(*)
        FROM expenses
        WHERE owner_id = ?
        AND YEAR(expense_date) = YEAR(CURDATE())
        AND MONTH(expense_date) = MONTH(CURDATE())
    ) AS monthly_count
 
FROM expenses
 
WHERE owner_id = ?
`,

  getCategoryBreakdownWeek: `
SELECT
    category,
    SUM(amount) AS total,
    COUNT(*) AS count
FROM expenses
WHERE owner_id = ?
AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1)
GROUP BY category
ORDER BY total DESC
`,

  getCategoryBreakdownMonth: `
SELECT
    category,
    SUM(amount) AS total,
    COUNT(*) AS count
FROM expenses
WHERE owner_id = ?
AND YEAR(expense_date) = YEAR(CURDATE())
AND MONTH(expense_date) = MONTH(CURDATE())
GROUP BY category
ORDER BY total DESC
`,

  getCategoryBreakdownAll: `
SELECT
    category,
    SUM(amount) AS total,
    COUNT(*) AS count
FROM expenses
WHERE owner_id = ?
GROUP BY category
ORDER BY total DESC
`,

  getExpenseTrendWeek: `
SELECT
    WEEKDAY(expense_date) AS day_index,
    SUM(amount) AS total
FROM expenses
WHERE owner_id = ?
AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1)
GROUP BY WEEKDAY(expense_date)
ORDER BY day_index
`,

  getExpenseTrendMonth: `
SELECT
    DAY(expense_date) AS day_num,
    SUM(amount) AS total
FROM expenses
WHERE owner_id = ?
AND YEAR(expense_date) = YEAR(CURDATE())
AND MONTH(expense_date) = MONTH(CURDATE())
GROUP BY DAY(expense_date)
ORDER BY day_num
`,

  getExpenseTrendAll: `
SELECT
    DATE_FORMAT(expense_date, '%b') AS label,
    SUM(amount) AS total
FROM expenses
WHERE owner_id = ?
AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
GROUP BY
    YEAR(expense_date),
    MONTH(expense_date)
ORDER BY
    YEAR(expense_date),
    MONTH(expense_date)
`,
};
 
module.exports = expenseGetQueries;