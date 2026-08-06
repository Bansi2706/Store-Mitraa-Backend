const customerGetQueries = {
  getAllCustomers: `
    SELECT *
    FROM customers
    WHERE owner_id = ?
    ORDER BY created_at DESC
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

};

module.exports = customerGetQueries;