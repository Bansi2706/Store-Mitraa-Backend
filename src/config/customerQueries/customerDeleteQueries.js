const customerDeleteQueries = {
  deleteCustomer: `
    DELETE
    FROM customers
    WHERE id = ?
    AND owner_id = ?
  `,
};

module.exports = customerDeleteQueries;