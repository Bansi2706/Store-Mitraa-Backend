const invoiceGetQueries = {
  getAllInvoices: `
    SELECT
      i.id,
      i.invoice_number,
      i.created_at,
      i.total_amount,
      i.discount_total,
      i.payment_status,

      c.id AS customer_id,
      CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) AS customer_name,
      c.phone_number

    FROM invoices i

    INNER JOIN customers c
      ON i.customer_id = c.id

    WHERE i.owner_id = ?

    ORDER BY i.id DESC
  `,

  getInvoiceById: `
    SELECT
         i.*,

      c.first_name,
      c.last_name,
      c.phone_number,
      c.email,
      c.address,
      c.city,
      c.state,
      c.pincode,
      c.gst_number

    FROM invoices i

    JOIN customers c
    ON c.id = i.customer_id

    WHERE
        i.id = ?
        AND i.owner_id = ?
    `,

getInvoiceItems: `
SELECT
    id,
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
FROM invoice_items
WHERE invoice_id = ?
ORDER BY id ASC
`,

  searchInvoices: `
  SELECT
    i.id,
    i.invoice_number,
    i.created_at,
    i.total_amount,
    i.discount_total,
    i.payment_status,

    c.id AS customer_id,
    CONCAT(c.first_name, ' ', IFNULL(c.last_name, '')) AS customer_name,
    c.phone_number

  FROM invoices i

  INNER JOIN customers c
    ON i.customer_id = c.id

  WHERE i.owner_id = ?
`,

getInvoicePreview: `
SELECT
    i.id,
    i.invoice_number,
    i.created_at,

    i.subtotal,
    i.discount_total,
    i.tax_total,
    i.total_amount,
    i.paid_amount,
    i.remaining_amount,

    i.payment_mode,
    i.payment_status,
    i.notes,

    c.first_name,
    c.last_name,
    c.phone_number,
    c.email,
    c.address,
    c.city,
    c.state,
    c.pincode,
    c.gst_number

FROM invoices i

INNER JOIN customers c
    ON c.id = i.customer_id

WHERE i.id = ?
AND i.owner_id = ?
`,

getInvoicePreviewItems: `
SELECT
    product_name,
    product_sku,
    mrp,
    quantity,
    selling_price,
    discount_percentage,
    discount,
    tax,
    line_total
FROM invoice_items
WHERE invoice_id = ?
ORDER BY id ASC
`,

getOwnerDetails: `
SELECT
    shop_name,
    owner_name,
    email,
    phone,
    whatsapp,
    address,
    logo
FROM owners
WHERE id = ?
`,

getInvoicePdf: `
SELECT
    pdf_path
FROM invoices
WHERE id = ?
AND owner_id = ?
`,

getProductForCalculation: `
SELECT
    id,
    product_mrp,
    buying_price
FROM products
WHERE id = ?
AND owner_id = ?
`,

};

module.exports = invoiceGetQueries;
