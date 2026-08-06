const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
  createBill,
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
  filterVendorBills,
  getPaymentHistory,
  addPayment
} = require("../controllers/vendorBill.controller");

router.post("/", verifyToken, createBill);

router.post("/:id/add-payment", verifyToken, addPayment);

router.get("/", verifyToken, getAllBills);

router.get("/filter", verifyToken, filterVendorBills);

router.get("/:billId/payment-history", verifyToken, getPaymentHistory);

router.get("/:id", verifyToken, getBillById);

router.put("/:id", verifyToken, updateBill);

router.delete("/:id", verifyToken, deleteBill);

module.exports = router;