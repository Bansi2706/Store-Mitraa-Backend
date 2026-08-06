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
    default_reminder_days,
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
    default_reminder_days,
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

    const [vendors] = await db.query(
        vendorGetQueries.getAllVendors,
        [owner_id]
    );

    res.status(200).json({
        success: true,
        count: vendors.length,
        data: vendors,
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
    default_reminder_days,
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
      default_reminder_days,
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

  let query = `
    SELECT *
    FROM vendors
    WHERE owner_id = ?
  `;

  const values = [owner_id];

  // Search
  if (q) {
    const search = `%${q}%`;

    query += `
      AND (
        vendor_company_name LIKE ?
        OR email LIKE ?
        OR phone LIKE ?
      )
    `;

    values.push(
      search,
      search,
      search
    );
  }

  // Status Filter
  if (
    status &&
    status !== "All Vendors"
  ) {
    query += ` AND status = ?`;
    values.push(status);
  }

  query += ` ORDER BY id DESC`;

  const [vendors] = await db.query(query, values);

  return res.status(200).json({
    success: true,
    data: vendors,
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