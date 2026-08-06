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

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerDashboard,
  getRevenueTrend,
  getGrowthMix
};