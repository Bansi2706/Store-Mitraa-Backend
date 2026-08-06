const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerDashboard,
  getRevenueTrend,
  getGrowthMix
} = require("../controllers/customer.controller");

router.post("/", verifyToken, createCustomer);

// Dashboard
router.get("/dashboard", verifyToken, getCustomerDashboard);

//Chart(sales, paid)
router.get("/revenue-trend", verifyToken, getRevenueTrend);

//Customers chart
router.get("/growth-mix", verifyToken, getGrowthMix);

// Search customers
router.get("/search", verifyToken, searchCustomers);

router.get("/", verifyToken, getAllCustomers);

router.get("/:id", verifyToken, getCustomerById);

router.put("/:id", verifyToken, updateCustomer);

router.delete("/:id", verifyToken, deleteCustomer);

module.exports = router;