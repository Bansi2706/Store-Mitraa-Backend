const vendorPutQueries = {
  updateVendor: `
    UPDATE vendors
    SET
      vendor_company_name = ?,
      display_name = ?,
      payment_terms = ?,
      gst_vat_number = ?,
      default_reminder_days = ?,
      status = ?,
      contact_person = ?,
      email = ?,
      phone = ?,
      alternate_phone = ?,
      address_line_1 = ?,
      address_line_2 = ?,
      city = ?,
      state = ?,
      postal_code = ?,
      country = ?,
      notes = ?
    WHERE id = ? AND owner_id = ?
  `
};

module.exports = vendorPutQueries;