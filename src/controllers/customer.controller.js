const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const customerPostQueries = require("../config/customerQueries/customerPostQueries");
const customerGetQueries = require("../config/customerQueries/customerGetQueries");
const customerPutQueries = require("../config/customerQueries/customerPutQueries");
const customerDeleteQueries = require("../config/customerQueries/customerDeleteQueries");

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
  const [phoneExists] = await db.query(
    customerPostQueries.checkPhone,
    [phone_number, owner_id]
  );

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

  const [customers] = await db.query(
    customerGetQueries.getAllCustomers,
    [owner_id]
  );

  res.status(200).json({
    success: true,
    data: customers,
  });
});

// Get Customer By ID
const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [customer] = await db.query(
    customerGetQueries.getCustomerById,
    [id, owner_id]
  );

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

  const [customers] = await db.query(
    customerGetQueries.searchCustomers,
    [
      owner_id,
      keyword,
      keyword,
      keyword,
      keyword,
    ]
  );

  res.status(200).json({
    success: true,
    data: customers,
  });
});

//Dashboard
const getCustomerDashboard = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [result] = await db.query(
    customerGetQueries.getCustomerDashboard,
    [
      owner_id,
      owner_id,
      owner_id,
      owner_id,
      owner_id,
    ]
  );

  res.status(200).json({
    success: true,
    data: result[0],
  });
});

//Chart(Sales,paid)
const getRevenueTrend = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [result] = await db.query(
    customerGetQueries.getRevenueTrend,
    [owner_id]
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

//Customers chart
const getGrowthMix = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [result] = await db.query(
    customerGetQueries.getGrowthMix,
    [owner_id]
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

//filter
const filterCustomers = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const {
    keyword,
    status,
    sort
  } = req.query;

  const [rows] = await db.query(
    customerGetQueries.filterCustomers,
    [owner_id]
  );

  let customers = rows;

  // Search
  if (keyword) {
    const search = keyword.toLowerCase();

    customers = customers.filter(c =>
      (c.first_name || "").toLowerCase().includes(search) ||
      (c.last_name || "").toLowerCase().includes(search) ||
      (c.phone_number || "").includes(search) ||
      (c.email || "").toLowerCase().includes(search) ||
      (c.city || "").toLowerCase().includes(search)
    );
  }

  // Status
  if (status && status !== "All") {
    customers = customers.filter(c => c.status === status);
  }

  // Sorting
  switch (sort) {
    case "recent":
      customers.sort(
        (a, b) =>
          new Date(b.last_invoice_date || 0) -
          new Date(a.last_invoice_date || 0)
      );
      break;

    case "highest_spending":
      customers.sort(
        (a, b) => b.total_spent - a.total_spent
      );
      break;

    case "most_orders":
      customers.sort(
        (a, b) => b.total_orders - a.total_orders
      );
      break;

    case "highest_outstanding":
      customers.sort(
        (a, b) => b.outstanding_amount - a.outstanding_amount
      );
      break;

    case "name_asc":
      customers.sort((a, b) =>
        a.first_name.localeCompare(b.first_name)
      );
      break;

    case "name_desc":
      customers.sort((a, b) =>
        b.first_name.localeCompare(a.first_name)
      );
      break;
  }

  res.status(200).json({
    success: true,
    data: customers,
  });
});

//Top 4 cutomers
const getTopCustomers = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [customers] = await db.query(
    customerGetQueries.getTopCustomers,
    [owner_id]
  );

  res.status(200).json({
    success: true,
    data: customers,
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
    [phone_number, id, owner_id]
  );

  if (phoneExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Phone number already exists",
    });
  }

  const [result] = await db.query(
    customerPutQueries.updateCustomer,
    [
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
    ]
  );

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

  const [result] = await db.query(
    customerDeleteQueries.deleteCustomer,
    [id, owner_id]
  );

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
  updateCustomer,
  deleteCustomer,
};