const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
  createInvoice, getAllInvoices, searchInvoices, calculateInvoice, getInvoicePreview, getInvoiceById, generateInvoicePDFController, downloadInvoicePDF, updateInvoice, deleteInvoice
} = require("../controllers/invoice.controller");

router.post("/", verifyToken, createInvoice);

router.get("/", verifyToken, getAllInvoices);

router.get("/search", verifyToken, searchInvoices);

router.post("/calculate",verifyToken, calculateInvoice);

router.get("/:id/preview", verifyToken, getInvoicePreview);

router.get("/:id/pdf", verifyToken, generateInvoicePDFController);

router.get("/:id/download", verifyToken, downloadInvoicePDF);

router.get("/:id", verifyToken, getInvoiceById);

router.put("/:id", verifyToken, updateInvoice);

router.delete("/:id", verifyToken, deleteInvoice);

module.exports = router;