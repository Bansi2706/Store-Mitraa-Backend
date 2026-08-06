const invoicePostQueries = {
  checkCustomerByPhone: `
    SELECT id
    FROM customers
    WHERE owner_id = ?
    AND phone_number = ?
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
    address
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  createInvoice: `
    INSERT INTO invoices
    (
      owner_id,
      customer_id,
      invoice_number,
      subtotal,
      discount_total,
      tax_total,
      total_amount,
      paid_amount,
      remaining_amount,
      payment_mode,
      payment_status,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
};

module.exports = invoicePostQueries;
