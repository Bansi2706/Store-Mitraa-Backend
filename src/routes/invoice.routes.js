const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
  createInvoice,
  getAllInvoices,
  searchInvoices,
  calculateInvoice,
  getInvoiceDashboard,
  getInvoicePreview,
  getInvoiceById,
  getInvoicePDF, 
  getPublicInvoicePDF,       
  shareInvoice,
  updateInvoice,
  deleteInvoice,
} = require("../controllers/invoice.controller");

// Dashboard
router.get("/dashboard", verifyToken, getInvoiceDashboard);

// Search
router.get("/search", verifyToken, searchInvoices);

// Calculate Invoice
router.post("/calculate", verifyToken, calculateInvoice);

// Create Invoice
router.post("/", verifyToken, createInvoice);

// Get All Invoices
router.get("/", verifyToken, getAllInvoices);

// Public PDF route — NO verifyToken, koi bhi khol sakta hai agar token match kare
router.get("/public/:id/:token/pdf", getPublicInvoicePDF);

// Invoice Preview
router.get("/:id/preview", verifyToken, getInvoicePreview);

// Generate + Download PDF (combined)          
router.get("/:id/pdf", verifyToken, getInvoicePDF);   

//Share 
router.get("/:id/share", verifyToken, shareInvoice);

// Get Invoice By ID
router.get("/:id", verifyToken, getInvoiceById);

// Update Invoice
router.put("/:id", verifyToken, updateInvoice);

// Delete Invoice
router.delete("/:id", verifyToken, deleteInvoice);

module.exports = router;