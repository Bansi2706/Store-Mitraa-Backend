const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const vendorBillPostQueries = require("../config/vendorBillQueries/vendorBillPostQueries");
const vendorBillGetQueries = require("../config/vendorBillQueries/vendorBillGetQueries");
const vendorBillPutQueries = require("../config/vendorBillQueries/vendorBillPutQueries");
const vendorBillDeleteQueries = require("../config/vendorBillQueries/vendorBillDeleteQueries");

const createBill = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const {
    vendor_id,
    bill_number,
    bill_date,
    total_amount,
    paid_amount,
    due_date,
    reminder_days,
    payment_mode,
    payment_reference,
    notes,
  } = req.body;

  // Check Bill Number
  const [billExists] = await db.query(
    vendorBillPostQueries.checkBillNumber,
    [bill_number]
  );

  if (billExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Bill number already exists",
    });
  }

  const remaining_amount =
    Number(total_amount) - Number(paid_amount);

  let status = "Pending";

  if (Number(paid_amount) === 0) {
    status = "Pending";
  } else if (Number(paid_amount) < Number(total_amount)) {
    status = "Partial";
  } else {
    status = "Paid";
  }

  await db.query(vendorBillPostQueries.createBill, [
    owner_id,
    vendor_id,
    bill_number,
    bill_date,
    total_amount,
    paid_amount,
    remaining_amount,
    due_date,
    reminder_days,
    payment_mode,
    payment_reference,
    status,
    notes,
  ]);

  res.status(201).json({
    success: true,
    message: "Vendor bill created successfully",
  });
});

const getAllBills = asyncHandler(async (req, res) => {
    const owner_id = req.owner.id;

    const [bills] = await db.query(
        vendorBillGetQueries.getAllBills,
        [owner_id]
    );

    res.status(200).json({
        success: true,
        count: bills.length,
        data: bills,
    });
});

const getBillById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [bill] = await db.query(
    vendorBillGetQueries.getBillById,
    [id, owner_id]
  );

  if (bill.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Bill not found",
    });
  }

  res.status(200).json({
    success: true,
    data: bill[0],
  });
});

const updateBill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const {
    bill_number,
    bill_date,
    total_amount,
    paid_amount,
    due_date,
    reminder_days,
    payment_mode,
    payment_reference,
    notes,
  } = req.body;

  const remaining_amount =
    Number(total_amount) - Number(paid_amount);

  let status = "Pending";

  if (Number(paid_amount) === 0) {
    status = "Pending";
  } else if (Number(paid_amount) < Number(total_amount)) {
    status = "Partial";
  } else {
    status = "Paid";
  }

  const [result] = await db.query(
    vendorBillPutQueries.updateBill,
    [
      bill_number,
      bill_date,
      total_amount,
      paid_amount,
      remaining_amount,
      due_date,
      reminder_days,
      payment_mode,
      payment_reference,
      status,
      notes,
      id,
      owner_id,
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Bill not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Bill updated successfully",
  });
});

const deleteBill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [result] = await db.query(
    vendorBillDeleteQueries.deleteBill,
    [id, owner_id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Bill not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Bill deleted successfully",
  });
});

const filterVendorBills = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const {
    q,
    start_date,
    end_date,
    due_start,
    due_end,
    status,
  } = req.query;

  let query = `
    SELECT *
    FROM vendor_bills
    WHERE owner_id = ?
  `;

  const values = [owner_id];

  // Search Bill Number
  if (q) {
    query += ` AND bill_number LIKE ?`;
    values.push(`%${q}%`);
  }

  // Bill Date Range
  if (start_date && end_date) {
    query += ` AND bill_date BETWEEN ? AND ?`;
    values.push(start_date, end_date);
  }

  // Due Date Range
  if (due_start && due_end) {
    query += ` AND due_date BETWEEN ? AND ?`;
    values.push(due_start, due_end);
  }

  // Status
  if (status && status !== "All Statuses") {
    query += ` AND status = ?`;
    values.push(status);
  }

  query += ` ORDER BY id DESC`;

  const [bills] = await db.query(query, values);

  return res.status(200).json({
    success: true,
    data: bills,
  });
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
  const { billId } = req.params;

  const [rows] = await db.query(
    vendorBillGetQueries.getPaymentHistory,
    [billId, owner_id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Bill not found",
    });
  }

  const summary = {
    bill_number: rows[0].bill_number,
    bill_amount: rows[0].total_amount,
    paid: rows[0].paid_amount,
    history: rows[0].paid_amount,
    balance: rows[0].remaining_amount,
  };

  const payments = rows
    .filter((row) => row.id !== null)
    .map((row) => ({
      id: row.id,
      amount: row.amount,
      payment_date: row.payment_date,
      payment_mode: row.payment_mode,
      payment_reference: row.payment_reference,
      notes: row.notes,
      created_at: row.created_at,
    }));

  return res.status(200).json({
    success: true,
    summary,
    payments,
  });
});

const addPayment = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
  const { id } = req.params;

  const {
    payment_date,
    amount,
    payment_mode,
    payment_reference,
    notes,
  } = req.body;

  // Check Bill
  const [bill] = await db.query(
    vendorBillPostQueries.getVendorBillById,
    [id, owner_id]
  );

  if (bill.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Vendor bill not found",
    });
  }

  const vendorBill = bill[0];

  const totalAmount = Number(vendorBill.total_amount);
  const paidAmount = Number(vendorBill.paid_amount);
  const paymentAmount = Number(amount);

  // Validation
  if (paymentAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Payment amount must be greater than 0",
    });
  }

  if (paymentAmount > Number(vendorBill.remaining_amount)) {
    return res.status(400).json({
      success: false,
      message: "Payment amount cannot be greater than remaining amount",
    });
  }

  // Insert Payment
  await db.query(
    vendorBillPostQueries.addPayment,
    [
      owner_id,
      id,
      paymentAmount,
      payment_date,
      payment_mode,
      payment_reference || null,
      notes || null,
    ]
  );

  // Calculate
  const newPaidAmount = paidAmount + paymentAmount;
  const newRemainingAmount = totalAmount - newPaidAmount;

  let status = "Pending";

  if (newPaidAmount === 0) {
    status = "Pending";
  } else if (newRemainingAmount === 0) {
    status = "Paid";
  } else {
    status = "Partial";
  }

  // Update Vendor Bill
  await db.query(
    vendorBillPostQueries.updateVendorBillPayment,
    [
      newPaidAmount,
      newRemainingAmount,
      status,
      id,
      owner_id,
    ]
  );

  return res.status(200).json({
    success: true,
    message: "Payment added successfully",
  });
});

module.exports = {
  createBill,
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
  filterVendorBills,
  getPaymentHistory,
  addPayment
};