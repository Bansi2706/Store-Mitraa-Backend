const vendorPostQueries = {
  checkEmail: `
    SELECT id
    FROM vendors
    WHERE email = ?
  `,

  checkGst: `
    SELECT id
    FROM vendors
    WHERE gst_vat_number = ?
  `,

  createVendor: `
    INSERT INTO vendors (
      owner_id,
      vendor_company_name,
      display_name,
      payment_terms,
      gst_vat_number,
      status,
      contact_person,
      email,
      phone,
      alternate_phone,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
};

module.exports = vendorPostQueries;