const invoiceDeleteQueries = {
  getInvoice: `
    SELECT
      id
    FROM invoices
    WHERE id = ?
    AND owner_id = ?
  `,

  getInvoiceItems: `
    SELECT
      product_id,
      quantity
    FROM invoice_items
    WHERE invoice_id = ?
  `,

  getProductById: `
    SELECT
      id,
      stock_quantity
    FROM products
    WHERE id = ?
    AND owner_id = ?
  `,

  updateProductStock: `
    UPDATE products
    SET stock_quantity = ?
    WHERE id = ?
    AND owner_id = ?
  `,

  deleteInvoice: `
    DELETE FROM invoices
    WHERE id = ?
    AND owner_id = ?
  `,
};

module.exports = invoiceDeleteQueries;