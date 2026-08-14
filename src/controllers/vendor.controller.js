const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const vendorPostQueries = require("../config/vendorQueries/vendorPostQueries");
const vendorGetQueries = require("../config/vendorQueries/vendorGetQueries");
const vendorPutQueries = require("../config/vendorQueries/vendorPutQueries");
const vendorDeleteQueries = require("../config/vendorQueries/vendorDeleteQueries")

const createVendor = asyncHandler(async (req, res) => {
  const {
    vendor_company_name,
    display_name,
    payment_terms,
    gst_vat_number,
    status,
    contact_person,
    email,
    phone,
    alternate_phone,
    address_line_1,
    address_line_2,
    city,
    state,
    postal_code,
    country,
    notes,
  } = req.body;

  const owner_id = req.owner.id;

  // 👇 Phone number compulsory
  if (!phone || !phone.trim()) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required",
    });
  }

  // Check Email
  if (email) {
    const [emailExists] = await db.query(
      vendorPostQueries.checkEmail,
      [email]
    );

    if (emailExists.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }
  }

  // Check GST
  if (gst_vat_number) {
    const [gstExists] = await db.query(
      vendorPostQueries.checkGst,
      [gst_vat_number]
    );

    if (gstExists.length > 0) {
      return res.status(400).json({
        success: false,
        message: "GST already exists",
      });
    }
  }

  await db.query(vendorPostQueries.createVendor, [
    owner_id,
    vendor_company_name,
    display_name,
    payment_terms,
    gst_vat_number,
    status,
    contact_person,
    email,
    phone,
    alternate_phone,
    address_line_1,
    address_line_2,
    city,
    state,
    postal_code,
    country,
    notes,
  ]);

  res.status(201).json({
    success: true,
    message: "Vendor created successfully",
  });
});

const getAllVendors = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  const [vendors] = await db.query(vendorGetQueries.getAllVendors, [
    owner_id,
    limit,
    offset,
  ]);

  const [countResult] = await db.query(vendorGetQueries.getVendorsCount, [
    owner_id,
  ]);

  const totalRecords = countResult[0].total;
  const totalPages = Math.ceil(totalRecords / limit);

  res.status(200).json({
    success: true,
    count: vendors.length,
    data: vendors,
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

const getVendorById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const owner_id = req.owner.id;

    const [vendor] = await db.query(
        vendorGetQueries.getVendorById,
        [id, owner_id]
    );

    if (vendor.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Vendor not found",
        });
    }

    res.status(200).json({
        success: true,
        data: vendor[0],
    });
});

const updateVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const {
    vendor_company_name,
    display_name,
    payment_terms,
    gst_vat_number,
    status,
    contact_person,
    email,
    phone,
    alternate_phone,
    address_line_1,
    address_line_2,
    city,
    state,
    postal_code,
    country,
    notes,
  } = req.body;

  const [result] = await db.query(
    vendorPutQueries.updateVendor,
    [
      vendor_company_name,
      display_name,
      payment_terms,
      gst_vat_number,
      status,
      contact_person,
      email,
      phone,
      alternate_phone,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      notes,
      id,
      owner_id,
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Vendor not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Vendor updated successfully",
  });
});

const deleteVendor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const owner_id = req.owner.id;

    const [result] = await db.query(
        vendorDeleteQueries.deleteVendor,
        [id, owner_id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({
            success: false,
            message: "Vendor not found",
        });
    }

    res.status(200).json({
        success: true,
        message: "Vendor deleted successfully",
    });
});

const getVendorDashboard = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [result] = await db.query(
    vendorGetQueries.getVendorDashboard,
    [
      owner_id,
      owner_id,
      owner_id,
    ]
  );

  return res.status(200).json({
    success: true,
    data: result[0],
  });
});

const filterVendors = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const { q, status } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  let baseCondition = `WHERE owner_id = ?`;
  const values = [owner_id];

  // Search
  if (q) {
    const search = `%${q}%`;
    baseCondition += `
      AND (
        vendor_company_name LIKE ?
        OR email LIKE ?
        OR phone LIKE ?
      )
    `;
    values.push(search, search, search);
  }

  // Status Filter
  if (status && status !== "All Vendors") {
    baseCondition += ` AND status = ?`;
    values.push(status);
  }

  // Count query (pagination ke liye pehle total nikalna)
  const countQuery = `SELECT COUNT(*) AS total FROM vendors ${baseCondition}`;
  const [countResult] = await db.query(countQuery, values);
  const totalRecords = countResult[0].total;
  const totalPages = Math.ceil(totalRecords / limit);

  // Data query
  const dataQuery = `
    SELECT * FROM vendors
    ${baseCondition}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;
  const [vendors] = await db.query(dataQuery, [...values, limit, offset]);

  return res.status(200).json({
    success: true,
    data: vendors,
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

const getVendorDetailsDashboard = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
  const { id } = req.params;

  const [result] = await db.query(
    vendorGetQueries.getVendorDetailsDashboard,
    [
      owner_id,
      id,
      owner_id,
      id,
    ]
  );

  return res.status(200).json({
    success: true,
    data: result[0],
  });
});

module.exports = {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  getVendorDashboard,
  filterVendors,
  getVendorDetailsDashboard
};