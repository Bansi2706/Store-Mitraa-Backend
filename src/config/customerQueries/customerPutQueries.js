const customerPutQueries = {
  checkPhoneExcludingSelf: `
    SELECT id
    FROM customers
    WHERE phone_number = ?
    AND id != ?
    AND owner_id = ?
  `,

  updateCustomer: `
    UPDATE customers
    SET
      first_name = ?,
      last_name = ?,
      phone_number = ?,
      email = ?,
      city = ?,
      state = ?,
      pincode = ?,
      gst_number = ?,
      address = ?,
      status = ?
    WHERE id = ?
    AND owner_id = ?
  `,
};

module.exports = customerPutQueries;