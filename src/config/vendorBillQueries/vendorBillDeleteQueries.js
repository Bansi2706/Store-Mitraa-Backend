const vendorBillDeleteQueries = {
  deleteBill: `
    DELETE FROM vendor_bills
    WHERE id = ? AND owner_id = ?
  `
};

module.exports = vendorBillDeleteQueries;