const path = require("path");
const fs = require("fs");

const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const invoicePostQueries = require("../config/invoiceQueries/invoicePostQueries");
const invoiceGetQueries = require("../config/invoiceQueries/invoiceGetQueries");
const invoicePutQueries = require("../config/invoiceQueries/invoicePutQueries");
const invoiceDeleteQueries = require("../config/invoiceQueries/invoiceDeleteQueries");

const generateInvoicePDF = require("../utils/pdfGenerator");

const createInvoice = asyncHandler(async (req, res) => {
  const {
    first_name,
    last_name,
    phone_number,
    email,
    city,
    state,
    pincode,
    gst_number,
    address,
    payment_mode,
    paid_amount,
    notes,
    items,
  } = req.body;

  const owner_id = req.owner.id;

  // Validate Phone Number
  if (!phone_number) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required",
    });
  }

  // Remove extra spaces
  const phone = phone_number.trim();

  // Check Customer
  let customer_id;

  const [customers] = await db.query(invoicePostQueries.checkCustomerByPhone, [
    owner_id,
    phone,
  ]);

  if (customers.length > 0) {
    customer_id = customers[0].id;
  } else {
    const [customerResult] = await db.query(invoicePostQueries.createCustomer, [
      owner_id,
      first_name,
      last_name,
      phone,
      email,
      city,
      state,
      pincode,
      gst_number,
      address,
    ]);

    customer_id = customerResult.insertId;
  }

  // Check Items
  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please add at least one product",
    });
  }

  // Generate Invoice Number
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const invoiceItems = [];

  for (const item of items) {
    const [products] = await db.query(invoicePostQueries.getProductById, [
      item.product_id,
      owner_id,
    ]);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Product not found : ${item.product_id}`,
      });
    }

    const product = products[0];

    if (product.stock_quantity < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `${product.product_name} is out of stock`,
      });
    }

    const mrp = Number(product.product_mrp);
    const buyingPrice = Number(product.buying_price);

    const quantity = Number(item.quantity);

    const discountPercentage = Number(item.discount_percentage || 0);

    // Discount Amount (rounded to 2 decimals to avoid drift)
    const discountAmount =
      item.discount_amount !== undefined
        ? Number(item.discount_amount)
        : Math.round(((mrp * discountPercentage) / 100) * quantity * 100) / 100;

    // Final Selling Price (per unit)
    const sellingPrice =
  item.unit_price !== undefined
    ? Number(item.unit_price)
    : Math.floor((mrp - (mrp * discountPercentage) / 100) * 100) / 100;

    const tax = Number(item.tax || 0);

    // Subtotal before discount
    const lineSubtotal = Math.floor(mrp * quantity * 100) / 100;

    // Final Line Total
    const lineTotal =
      Math.floor((lineSubtotal - discountAmount + tax) * 100) / 100;

    subtotal += lineSubtotal;
    discountTotal += discountAmount;
    taxTotal += tax;

    invoiceItems.push({
      product,
      quantity,
      buying_price: buyingPrice,
      selling_price: sellingPrice,
      mrp,     
      discount_percentage: discountPercentage,
      discount: discountAmount,
      tax,
      line_total: lineTotal,
    });
  }

  const totalAmount = subtotal - discountTotal + taxTotal;

  const paidAmount = Number(paid_amount || 0);

  if (paidAmount < 0) {
    return res.status(400).json({
      success: false,
      message: "Paid amount cannot be negative",
    });
  }

  const totalAmountRounded = Math.round(totalAmount * 100) / 100;
  const paidAmountRounded = Math.round(paidAmount * 100) / 100;

  if (paidAmountRounded > totalAmountRounded) {
    return res.status(400).json({
      success: false,
      message: "Paid amount cannot be greater than total amount",
    });
  }

  const remainingAmount = totalAmountRounded - paidAmountRounded;

  let paymentStatus = "Pending";

  if (paidAmount === 0) {
    paymentStatus = "Pending";
  } else if (paidAmount >= totalAmount) {
    paymentStatus = "Paid";
  } else {
    paymentStatus = "Partial";
  }

  const invoiceNumber = `INV-${Date.now()}`;

  // Save Invoice
  const [result] = await db.query(invoicePostQueries.createInvoice, [
    owner_id,
    customer_id,
    invoiceNumber,
    subtotal,
    discountTotal,
    taxTotal,
    totalAmountRounded,
    paidAmountRounded,
    remainingAmount,
    payment_mode,
    paymentStatus,
    notes,
  ]);

  const invoiceId = result.insertId;

  for (const item of invoiceItems) {
    await db.query(invoicePostQueries.createInvoiceItem, [
      invoiceId,
      item.product.id,
      item.product.product_name,
      item.product.product_sku,
      item.mrp, 
      item.quantity,
      item.buying_price,
      item.selling_price,
      item.discount_percentage,
      item.discount,
      item.tax,
      item.line_total,
    ]);

    const newStock = item.product.stock_quantity - item.quantity;

    await db.query(invoicePostQueries.updateProductStock, [
      newStock,
      item.product.id,
      owner_id,
    ]);
  }

  return res.status(201).json({
    success: true,
    message: "Invoice created successfully",
    invoice_id: invoiceId,
    invoice_number: invoiceNumber,
  });
});

const getAllInvoices = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [invoices] = await db.query(invoiceGetQueries.getAllInvoices, [
    owner_id,
  ]);

  res.status(200).json({
    success: true,
    data: invoices,
  });
});

const searchInvoices = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const { keyword = "", status = "" } = req.query;

  let query = invoiceGetQueries.searchInvoices;

  const values = [owner_id];

  if (keyword) {
    query += `
      AND (
        i.invoice_number LIKE ?
        OR c.first_name LIKE ?
        OR c.last_name LIKE ?
        OR c.phone_number LIKE ?
      )
    `;

    const search = `%${keyword}%`;

    values.push(search, search, search, search);
  }

  if (status) {
    query += `
      AND i.payment_status = ?
    `;

    values.push(status);
  }

  query += `
    ORDER BY i.id DESC
  `;

  const [invoices] = await db.query(query, values);

  return res.status(200).json({
    success: true,
    data: invoices,
  });
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [invoice] = await db.query(invoiceGetQueries.getInvoiceById, [
    id,
    owner_id,
  ]);

  if (invoice.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  const [items] = await db.query(invoiceGetQueries.getInvoiceItems, [id]);

  const invoiceData = invoice[0];
  invoiceData.items = items;

  res.status(200).json({
    success: true,
    data: invoiceData,
  });
});

const getInvoicePreview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  // Get Invoice
  const [invoice] = await db.query(invoiceGetQueries.getInvoicePreview, [
    id,
    owner_id,
  ]);

  if (invoice.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  // Get Invoice Items
  const [items] = await db.query(invoiceGetQueries.getInvoicePreviewItems, [
    id,
  ]);

  // Get Owner Details
  const [owner] = await db.query(invoiceGetQueries.getOwnerDetails, [owner_id]);

  return res.status(200).json({
    success: true,
    data: {
      owner: owner[0],
      invoice: invoice[0],
      items,
    },
  });
});

const updateInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { customer_id, payment_mode, paid_amount, notes, items } = req.body;

  const owner_id = req.owner.id;

  // Check Invoice
  const [invoice] = await db.query(invoicePutQueries.getInvoice, [
    id,
    owner_id,
  ]);

  if (invoice.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  // Check Customer
  const [customer] = await db.query(invoicePutQueries.checkCustomer, [
    customer_id,
    owner_id,
  ]);

  if (customer.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  // Check Items
  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please add at least one product",
    });
  }

  // Restore Old Stock
  const [oldItems] = await db.query(invoicePutQueries.getOldInvoiceItems, [id]);

  for (const oldItem of oldItems) {
    const [products] = await db.query(invoicePutQueries.getProductById, [
      oldItem.product_id,
      owner_id,
    ]);

    if (products.length > 0) {
      const newStock =
        Number(products[0].stock_quantity) + Number(oldItem.quantity);

      await db.query(invoicePutQueries.updateProductStock, [
        newStock,
        oldItem.product_id,
        owner_id,
      ]);
    }
  }

  // Delete Old Invoice Items
  await db.query(invoicePutQueries.deleteInvoiceItems, [id]);

  // Calculate New Invoice
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const invoiceItems = [];

  for (const item of items) {
    const [products] = await db.query(invoicePutQueries.getProductById, [
      item.product_id,
      owner_id,
    ]);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Product not found : ${item.product_id}`,
      });
    }

    const product = products[0];

    if (product.stock_quantity < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `${product.product_name} is out of stock`,
      });
    }

    // AFTER — historical mrp preferred over live product price
    const mrp = item.mrp !== undefined ? Number(item.mrp) : Number(product.product_mrp);
    const buyingPrice = Number(product.buying_price);

    const quantity = Number(item.quantity);

    const discountPercentage = Number(item.discount_percentage || 0);

    // Discount Amount (rounded to 2 decimals to avoid drift)
    const discountAmount =
      item.discount_amount !== undefined
        ? Number(item.discount_amount)
        : Math.round(((mrp * discountPercentage) / 100) * quantity * 100) / 100;

    // Final Selling Price (per unit)
    const sellingPrice =
  item.unit_price !== undefined
    ? Number(item.unit_price)
    : Math.floor((mrp - (mrp * discountPercentage) / 100) * 100) / 100;

    const tax = Number(item.tax || 0);

    // Subtotal before discount
    const lineSubtotal = Math.floor(mrp * quantity * 100) / 100;

    // Final Line Total
    const lineTotal =
      Math.floor((lineSubtotal - discountAmount + tax) * 100) / 100;

    subtotal += lineSubtotal;
    discountTotal += discountAmount;
    taxTotal += tax;

    invoiceItems.push({
      product,
      quantity,
      buying_price: buyingPrice,
      selling_price: sellingPrice,
      mrp, 
      discount_percentage: discountPercentage,
      discount: discountAmount,
      tax,
      line_total: lineTotal,
    });
  }

  const totalAmount = subtotal - discountTotal + taxTotal;

  const paidAmount = Number(paid_amount || 0);

  if (paidAmount < 0) {
    return res.status(400).json({
      success: false,
      message: "Paid amount cannot be negative",
    });
  }

  const totalAmountRounded = Math.round(totalAmount * 100) / 100;
  const paidAmountRounded = Math.round(paidAmount * 100) / 100;

  if (paidAmountRounded > totalAmountRounded) {
    return res.status(400).json({
      success: false,
      message: "Paid amount cannot be greater than total amount",
    });
  }

  const remainingAmount = totalAmountRounded - paidAmountRounded;

  let paymentStatus = "Pending";

  if (paidAmount === 0) {
    paymentStatus = "Pending";
  } else if (paidAmount >= totalAmount) {
    paymentStatus = "Paid";
  } else {
    paymentStatus = "Partial";
  }

  await db.query(invoicePutQueries.updateInvoice, [
    customer_id,
    subtotal,
    discountTotal,
    taxTotal,
    totalAmountRounded,
    paidAmountRounded,
    remainingAmount,
    payment_mode,
    paymentStatus,
    notes,
    id,
    owner_id,
  ]);

  for (const item of invoiceItems) {
    await db.query(invoicePutQueries.createInvoiceItem, [
      id,
      item.product.id,
      item.product.product_name,
      item.product.product_sku,
      item.mrp,  
      item.quantity,
      item.buying_price,
      item.selling_price,
      item.discount_percentage,
      item.discount,
      item.tax,
      item.line_total,
    ]);

    const newStock = item.product.stock_quantity - item.quantity;

    await db.query(invoicePutQueries.updateProductStock, [
      newStock,
      item.product.id,
      owner_id,
    ]);
  }

  return res.status(200).json({
    success: true,
    message: "Invoice updated successfully",
  });
});

const calculateInvoice = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const {
    product_id,
    quantity,
    discount_percentage,
    unit_price,
    total,
    field, // "discount_percentage" | "unit_price" | "total" | "quantity"
  } = req.body;

  // Validation
  if (!product_id) {
    return res.status(400).json({
      success: false,
      message: "Product is required",
    });
  }

  if (!quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be greater than 0",
    });
  }

  // Get Product
  const [products] = await db.query(
    invoiceGetQueries.getProductForCalculation,
    [product_id, owner_id],
  );

  if (products.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const product = products[0];

  const mrp = Number(product.product_mrp);
  const buyingPrice = Number(product.buying_price);
  const qty = Number(quantity);

  let finalUnitPrice;
  let discount;

  if (field === "total") {
    // Reverse calculate: Total -> Unit Price -> Discount %
    const totalNum = Number(total || 0);

    finalUnitPrice = qty > 0 ? totalNum / qty : 0;

    if (finalUnitPrice > mrp) {
      // Don't allow unit price to exceed MRP via total edit
      finalUnitPrice = mrp;
    }

    discount = mrp > 0 ? ((mrp - finalUnitPrice) / mrp) * 100 : 0;
  } else if (field === "unit_price") {
    // Reverse calculate: Unit Price -> Discount %
    finalUnitPrice = Number(unit_price || mrp);

    if (finalUnitPrice > mrp) {
      finalUnitPrice = mrp;
    }

    discount = mrp > 0 ? ((mrp - finalUnitPrice) / mrp) * 100 : 0;
  } else {
    // Default / "discount_percentage" / "quantity": Forward calculate
    discount = Number(discount_percentage || 0);
    const discountAmount = (mrp * discount) / 100;
    finalUnitPrice = mrp - discountAmount;
  }

  discount = Math.max(0, Math.min(100, discount));

  const discountAmount = mrp - finalUnitPrice;
  const totalAmount = finalUnitPrice * qty;
  const profit = (finalUnitPrice - buyingPrice) * qty;

  return res.status(200).json({
    success: true,
    data: {
      quantity: qty,
      mrp,
      discount_percentage: Number(discount.toFixed(2)),
      discount_amount: Number((discountAmount * qty).toFixed(2)),
      unit_price: Number(finalUnitPrice.toFixed(2)),
      total: Number(totalAmount.toFixed(2)),
      profit: Number(profit.toFixed(2)),
    },
  });
});

const generateInvoicePDFController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  // Get Invoice
  const [invoice] = await db.query(invoiceGetQueries.getInvoicePreview, [
    id,
    owner_id,
  ]);

  if (invoice.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  // Get Invoice Items
  const [items] = await db.query(invoiceGetQueries.getInvoicePreviewItems, [
    id,
  ]);

  // Get Owner Details
  const [owner] = await db.query(invoiceGetQueries.getOwnerDetails, [owner_id]);

  if (owner.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Owner not found",
    });
  }

  // Prepare Data
  const data = {
    owner: owner[0],
    invoice: invoice[0],
    items,
  };

  const customerFolder =
    `customer_${invoice[0].customer_id}_${invoice[0].first_name}_${invoice[0].last_name || ""}`.replace(
      /\s+/g,
      "_",
    );

  const folderPath = path.join(
    __dirname,
    "../../uploads/invoices",
    customerFolder,
  );

  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const pdfName = `${invoice[0].invoice_number}.pdf`;

  const pdfPath = path.join(folderPath, pdfName);

  // Generate PDF
  await generateInvoicePDF(data, pdfPath);

  // Save PDF Path
  await db.query(invoicePutQueries.updateInvoicePdf, [pdfPath, id, owner_id]);

  // Response
  return res.status(200).json({
    success: true,
    message: "Invoice PDF generated successfully",
    pdf_path: pdfPath,
  });
});

const downloadInvoicePDF = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [invoice] = await db.query(invoiceGetQueries.getInvoicePdf, [
    id,
    owner_id,
  ]);

  if (invoice.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  if (!invoice[0].pdf_path) {
    return res.status(404).json({
      success: false,
      message: "PDF not generated",
    });
  }

  return res.download(invoice[0].pdf_path);
});

const deleteInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const owner_id = req.owner.id;

  // Check Invoice
  const [invoice] = await db.query(invoiceDeleteQueries.getInvoice, [
    id,
    owner_id,
  ]);

  if (invoice.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  // Get Invoice Items
  const [invoiceItems] = await db.query(invoiceDeleteQueries.getInvoiceItems, [
    id,
  ]);

  if (invoiceItems.length > 0) {
    // Restore Stock
    for (const item of invoiceItems) {
      const [products] = await db.query(invoiceDeleteQueries.getProductById, [
        item.product_id,
        owner_id,
      ]);

      if (products.length > 0) {
        const newStock =
          Number(products[0].stock_quantity) + Number(item.quantity);

        await db.query(invoiceDeleteQueries.updateProductStock, [
          newStock,
          item.product_id,
          owner_id,
        ]);
      }
    }
  }

  await db.query(invoiceDeleteQueries.deleteInvoice, [id, owner_id]);

  return res.status(200).json({
    success: true,
    message: "Invoice deleted successfully",
  });
});

module.exports = {
  createInvoice,
  getAllInvoices,
  searchInvoices,
  getInvoiceById,
  getInvoicePreview,
  calculateInvoice,
  generateInvoicePDFController,
  downloadInvoicePDF,
  updateInvoice,
  deleteInvoice,
};
