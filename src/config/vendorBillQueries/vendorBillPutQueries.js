const vendorBillPutQueries = {
  updateBill: `
    UPDATE vendor_bills
    SET
      bill_number = ?,
      bill_date = ?,
      total_amount = ?,
      paid_amount = ?,
      remaining_amount = ?,
      due_date = ?,
      reminder_days = ?,
      payment_mode = ?,
      payment_reference = ?,
      status = ?,
      notes = ?
    WHERE id = ? AND owner_id = ?
  `
};

module.exports = vendorBillPutQueries;