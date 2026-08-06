const customerPostQueries = {
  checkPhone: `
    SELECT id
    FROM customers
    WHERE phone_number = ?
    AND owner_id = ?
  `,

  createCustomer: `
    INSERT INTO customers
    (
      owner_id,
      first_name,
      last_name,
      phone_number,
      email,
      city,
      state,
      pincode,
      gst_number,
      address,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
};

module.exports = customerPostQueries;