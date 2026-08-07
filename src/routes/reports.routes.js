const express = require("express");
const router = express.Router();

const { 
    getReportsOverview, 
    getSalesProfitReport, 
    getCashflowReport, 
    getCategoryPerformanceReport, 
    getCustomerInsightsReport,
    getPaymentInsightsReport
} = require("../controllers/reports.controller");
const verifyToken = require("../middleware/auth.middleware");

router.get("/overview", verifyToken, getReportsOverview);

//reports/sales-profit?period=weekly|monthly|quarterly|yearly
router.get("/sales-profit", verifyToken, getSalesProfitReport);

// // GET /api/reports/cashflow?period=weekly|monthly|quarterly|yearly
router.get("/cashflow", verifyToken, getCashflowReport);

// GET /api/reports/category-performance?period=weekly|monthly|quarterly|yearly
router.get("/category-performance", verifyToken, getCategoryPerformanceReport);

// GET /api/reports/customer-insights?period=weekly|monthly|quarterly|yearly
router.get("/customer-insights", verifyToken, getCustomerInsightsReport);

// GET /api/reports/payment-insights?period=weekly|monthly|quarterly|yearly
router.get("/payment-insights", verifyToken, getPaymentInsightsReport);

module.exports = router;