const vendorBillGetQueries = {
  getAllBills: `
    SELECT
      vb.*,
      v.vendor_company_name
    FROM vendor_bills vb
    JOIN vendors v
      ON vb.vendor_id = v.id
    WHERE vb.owner_id = ?
    ORDER BY vb.id DESC
  `,

  getBillsByVendor: `
    SELECT *
    FROM vendor_bills
    WHERE vendor_id = ?
      AND owner_id = ?
    ORDER BY id DESC
  `,

  getBillById: `
    SELECT *
    FROM vendor_bills
    WHERE id = ?
      AND owner_id = ?
  `,

  filterVendorBills: `
    SELECT *
    FROM vendor_bills
    WHERE owner_id = ?
  `,

  getPaymentHistory: `
SELECT
    vb.bill_number,
    vb.total_amount,
    vb.paid_amount,
    vb.remaining_amount,

    p.id,
    p.amount,
    p.payment_date,
    p.payment_mode,
    p.payment_reference,
    p.notes,
    p.created_at

FROM vendor_bills vb

LEFT JOIN vendor_bill_payments p
ON vb.id = p.vendor_bill_id

WHERE
    vb.id = ?
    AND vb.owner_id = ?

ORDER BY p.payment_date DESC,
         p.id DESC
`,
};

module.exports = vendorBillGetQueries;