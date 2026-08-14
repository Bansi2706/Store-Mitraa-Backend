const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const customerPostQueries = require("../config/customerQueries/customerPostQueries");
const customerGetQueries = require("../config/customerQueries/customerGetQueries");
const customerPutQueries = require("../config/customerQueries/customerPutQueries");
const customerDeleteQueries = require("../config/customerQueries/customerDeleteQueries");

// ---------- Helpers (for analytics) ----------
const money = (v) => Number(v || 0).toFixed(2);
const toDateOnly = (d) => (d ? new Date(d).toISOString().split("T")[0] : null);

const buildMonthKeys = () => {
  const keys = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label =
      d.toLocaleString("en-US", { month: "short" }) +
      " " +
      String(d.getFullYear()).slice(-2);
    keys.push({ key, label });
  }
  return keys;
};

// Create Customer
const createCustomer = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

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
    status,
  } = req.body;

  // Check Phone Number
  const [phoneExists] = await db.query(customerPostQueries.checkPhone, [
    phone_number,
    owner_id,
  ]);

  if (phoneExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Phone number already exists",
    });
  }

  await db.query(customerPostQueries.createCustomer, [
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
    status || "ACTIVE",
  ]);

  res.status(201).json({
    success: true,
    message: "Customer created successfully",
  });
});

// Get All Customers
const getAllCustomers = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  const [customers] = await db.query(customerGetQueries.getAllCustomers, [
    owner_id,
    limit,
    offset,
  ]);

  const [countResult] = await db.query(customerGetQueries.getCustomersCount, [
    owner_id,
  ]);

  const totalRecords = countResult[0].total;
  const totalPages = Math.ceil(totalRecords / limit);

  res.status(200).json({
    success: true,
    data: customers,
    pagination: {
      currentPage: page,
      totalPages,
      totalRecords,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

// Get Customer By ID
const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [customer] = await db.query(customerGetQueries.getCustomerById, [
    id,
    owner_id,
  ]);

  if (customer.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  res.status(200).json({
    success: true,
    data: customer[0],
  });
});

//Search Customer
const searchCustomers = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
  const { search } = req.query;

  if (!search) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  const keyword = `%${search}%`;

  const [customers] = await db.query(customerGetQueries.searchCustomers, [
    owner_id,
    keyword,
    keyword,
    keyword,
    keyword,
  ]);

  res.status(200).json({
    success: true,
    data: customers,
  });
});

//Dashboard
const getCustomerDashboard = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [result] = await db.query(customerGetQueries.getCustomerDashboard, [
    owner_id,
    owner_id,
    owner_id,
    owner_id,
    owner_id,
  ]);

  res.status(200).json({
    success: true,
    data: result[0],
  });
});

//Chart(Sales,paid)
const getRevenueTrend = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [result] = await db.query(customerGetQueries.getRevenueTrend, [
    owner_id,
  ]);

  res.status(200).json({
    success: true,
    data: result,
  });
});

//Customers chart
const getGrowthMix = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [result] = await db.query(customerGetQueries.getGrowthMix, [owner_id]);

  res.status(200).json({
    success: true,
    data: result,
  });
});

//filter
const filterCustomers = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const { keyword, status, sort } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  const [rows] = await db.query(customerGetQueries.filterCustomers, [owner_id]);

  let customers = rows;

  // Search
  if (keyword) {
    const search = keyword.toLowerCase();

    customers = customers.filter(
      (c) =>
        (c.first_name || "").toLowerCase().includes(search) ||
        (c.last_name || "").toLowerCase().includes(search) ||
        (c.phone_number || "").includes(search) ||
        (c.email || "").toLowerCase().includes(search) ||
        (c.city || "").toLowerCase().includes(search),
    );
  }

  // Status
  if (status && status !== "All") {
    customers = customers.filter((c) => c.status === status);
  }

  // Sorting
  switch (sort) {
    case "recent":
      customers.sort(
        (a, b) =>
          new Date(b.last_invoice_date || 0) -
          new Date(a.last_invoice_date || 0),
      );
      break;

    case "highest_spending":
      customers.sort((a, b) => b.total_spent - a.total_spent);
      break;

    case "most_orders":
      customers.sort((a, b) => b.total_orders - a.total_orders);
      break;

    case "highest_outstanding":
      customers.sort((a, b) => b.outstanding_amount - a.outstanding_amount);
      break;

    case "name_asc":
      customers.sort((a, b) => a.first_name.localeCompare(b.first_name));
      break;

    case "name_desc":
      customers.sort((a, b) => b.first_name.localeCompare(a.first_name));
      break;
  }

  // Pagination (filter/sort ke baad, kyunki poora processing JS mein ho raha hai)
  const totalRecords = customers.length;
  const totalPages = Math.ceil(totalRecords / limit);
  const startIndex = (page - 1) * limit;
  const paginatedCustomers = customers.slice(startIndex, startIndex + limit);

  res.status(200).json({
    success: true,
    data: paginatedCustomers,
    pagination: {
      currentPage: page,
      totalPages,
      totalRecords,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

//Top 4 cutomers
const getTopCustomers = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [customers] = await db.query(customerGetQueries.getTopCustomers, [
    owner_id,
  ]);

  res.status(200).json({
    success: true,
    data: customers,
  });
});

// ---------- Customer Analytics (Details Page) ----------
const getCustomerAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  // 1. Base customer
  const [customerRows] = await db.query(customerGetQueries.getCustomerBase, [
    id,
    owner_id,
  ]);

  if (customerRows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  const customer = customerRows[0];

  // 2. Run remaining queries in parallel
  const [
    summaryResult,
    profitResult,
    invoiceResult,
    productResult,
    trendResult,
  ] = await Promise.all([
    db.query(customerGetQueries.getInvoiceSummary, [id, owner_id]),
    db.query(customerGetQueries.getTotalProfit, [id, owner_id]),
    db.query(customerGetQueries.getCustomerInvoices, [id, owner_id]),
    db.query(customerGetQueries.getCustomerProducts, [id, owner_id]),
    db.query(customerGetQueries.getSpendTrendRaw, [id, owner_id]),
  ]);

  const summary = summaryResult[0][0];
  const totalProfitRow = profitResult[0][0];
  const invoiceRows = invoiceResult[0];
  const productRows = productResult[0];
  const trendRows = trendResult[0];

  const total_orders = summary.total_orders || 0;
  const total_spent = Number(summary.total_spent || 0);
  const average_order_value = total_orders > 0 ? total_spent / total_orders : 0;
  // 3. Zero-fill spend trend to always show last 6 months
  const monthKeys = buildMonthKeys();
  const trendMap = new Map(trendRows.map((r) => [r.month_key, r]));

  const spend_trend = monthKeys.map(({ key, label }) => {
    const row = trendMap.get(key);
    return {
      label,
      total_spend: money(row ? row.total_spend : 0),
      collected_amount: money(row ? row.collected_amount : 0),
    };
  });

  // 4. Shape final response
  const response = {
    customer_id: customer.customer_id,
    full_name: `${customer.first_name} ${customer.last_name || ""}`.trim(),
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    pincode: customer.pincode,
    gst_number: customer.gst_number,

    total_orders,
    total_spent: money(total_spent),
    outstanding_amount: money(summary.outstanding_amount),
    average_order_value: money(average_order_value),
    total_profit: money(totalProfitRow.total_profit),

    first_invoice_date: toDateOnly(summary.first_invoice_date),
    last_invoice_date: toDateOnly(summary.last_invoice_date),
    status: customer.status,

    invoices: invoiceRows.map((inv) => ({
      invoice_id: inv.invoice_id,
      invoice_number: inv.invoice_number,
      invoice_date: toDateOnly(inv.invoice_date),
      final_amount: money(inv.final_amount),
      paid_amount: money(inv.paid_amount),
      remaining_amount: money(inv.remaining_amount),
      total_profit: money(inv.total_profit),
      payment_status: inv.payment_status,
      invoice_status: "saved", // ⚠️ placeholder — invoice_status column schema mein nahi hai abhi
    })),

    products: productRows.map((p) => ({
      product_id: p.product_id,
      product_code: p.product_code,
      product_name: p.product_name,
      category: p.category,
      total_quantity: money(p.total_quantity),
      total_sales: money(p.total_sales),
      total_profit: money(p.total_profit),
    })),

    spend_trend,
  };

  res.status(200).json({
    success: true,
    data: response,
  });
});

// Update Customer
const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

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
    status,
  } = req.body;

  // Check Phone Number
  const [phoneExists] = await db.query(
    customerPutQueries.checkPhoneExcludingSelf,
    [phone_number, id, owner_id],
  );

  if (phoneExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Phone number already exists",
    });
  }

  const [result] = await db.query(customerPutQueries.updateCustomer, [
    first_name,
    last_name,
    phone_number,
    email,
    city,
    state,
    pincode,
    gst_number,
    address,
    status,
    id,
    owner_id,
  ]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Customer updated successfully",
  });
});

// Delete Customer
const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [result] = await db.query(customerDeleteQueries.deleteCustomer, [
    id,
    owner_id,
  ]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Customer deleted successfully",
  });
});

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  searchCustomers,
  getCustomerDashboard,
  getRevenueTrend,
  getGrowthMix,
  filterCustomers,
  getTopCustomers,
  getCustomerAnalytics,
  updateCustomer,
  deleteCustomer,
};
