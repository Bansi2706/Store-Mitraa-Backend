const vendorGetQueries = {
  getAllVendors: `
    SELECT *
    FROM vendors
    WHERE owner_id = ?
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `,

  getVendorsCount: `
    SELECT COUNT(*) AS total
    FROM vendors
    WHERE owner_id = ?
  `,

  getVendorById: `
    SELECT *
    FROM vendors
    WHERE id = ? AND owner_id = ?
  `,

  getVendorDashboard: `
SELECT
(
    SELECT COUNT(*)
    FROM vendors
    WHERE owner_id = ?
      AND status = 'Active'
) AS active_partners,

(
    SELECT IFNULL(SUM(total_amount), 0)
    FROM vendor_bills
    WHERE owner_id = ?
) AS total_bills,

(
    SELECT COUNT(*)
    FROM vendor_bills
    WHERE owner_id = ?
      AND status IN ('Pending','Partial')
) AS pending_bills
`,

  getVendorDetailsDashboard: `
SELECT
(
    SELECT IFNULL(SUM(remaining_amount), 0)
    FROM vendor_bills
    WHERE owner_id = ?
      AND vendor_id = ?
) AS total_outstanding,

(
    SELECT COUNT(*)
    FROM vendor_bills
    WHERE owner_id = ?
      AND vendor_id = ?
      AND status IN ('Pending','Partial')
) AS pending_bills
`,
};

module.exports = vendorGetQueries;