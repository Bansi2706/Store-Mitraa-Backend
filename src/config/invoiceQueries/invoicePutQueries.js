const invoicePutQueries = {
  checkCustomer: `
    SELECT id
    FROM customers
    WHERE id = ?
    AND owner_id = ?
  `,

  updateCustomer: `
    UPDATE customers
    SET
      first_name = ?,
      last_name = ?,
      phone_number = ?,
      email = ?,
      address = ?,
      city = ?,
      state = ?,
      pincode = ?,
      gst_number = ?
    WHERE id = ?
    AND owner_id = ?
  `,

  getInvoice: `
    SELECT id
    FROM invoices
    WHERE id = ?
    AND owner_id = ?
  `,

  getOldInvoiceItems: `
    SELECT
      product_id,
      quantity
    FROM invoice_items
    WHERE invoice_id = ?
  `,

  getProductById: `
    SELECT
      id,
      product_name,
      product_sku,
      buying_price,
      product_mrp,
      stock_quantity
    FROM products
    WHERE id = ?
    AND owner_id = ?
  `,

  updateInvoice: `
    UPDATE invoices
    SET
      customer_id = ?,
      subtotal = ?,
      discount_total = ?,
      tax_total = ?,
      total_amount = ?,
      paid_amount = ?,
      remaining_amount = ?,
      payment_mode = ?,
      payment_status = ?,
      notes = ?
    WHERE id = ?
    AND owner_id = ?
  `,

  deleteInvoiceItems: `
    DELETE FROM invoice_items
    WHERE invoice_id = ?
  `,

createInvoiceItem: `
INSERT INTO invoice_items
(
    invoice_id,
    product_id,
    product_name,
    product_sku,
    mrp,
    quantity,
    buying_price,
    selling_price,
    discount_percentage,
    discount,
    tax,
    line_total
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,

  updateProductStock: `
    UPDATE products
    SET stock_quantity = ?
    WHERE id = ?
    AND owner_id = ?
  `,

    updateInvoicePdf: `
UPDATE invoices
SET pdf_path = ?
WHERE id = ?
AND owner_id = ?
`,
};

module.exports = invoicePutQueries;