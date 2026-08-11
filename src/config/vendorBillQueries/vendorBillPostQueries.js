const vendorBillPostQueries = {
  checkBillNumber: `
    SELECT id
    FROM vendor_bills
    WHERE bill_number = ?
  `,

  createBill: `
    INSERT INTO vendor_bills (
      owner_id,
      vendor_id,
      bill_number,
      bill_date,
      total_amount,
      paid_amount,
      remaining_amount,
      due_date,
      payment_mode,
      payment_reference,
      status,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  // Get Bill
  getVendorBillById: `
    SELECT
      id,
      total_amount,
      paid_amount,
      remaining_amount
    FROM vendor_bills
    WHERE id = ?
      AND owner_id = ?
  `,

  // Add Payment
  addPayment: `
    INSERT INTO vendor_bill_payments
    (
      owner_id,
      vendor_bill_id,
      amount,
      payment_date,
      payment_mode,
      payment_reference,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,

  // Update Bill
  updateVendorBillPayment: `
    UPDATE vendor_bills
    SET
      paid_amount = ?,
      remaining_amount = ?,
      status = ?
    WHERE id = ?
      AND owner_id = ?
  `,
};

module.exports = vendorBillPostQueries;