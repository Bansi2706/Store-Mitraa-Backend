const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    deleteVendor,
    getVendorDashboard,
    filterVendors,
    getVendorDetailsDashboard
} = require("../controllers/vendor.controller");

router.post("/", verifyToken, createVendor);

router.get("/dashboard", verifyToken, getVendorDashboard);

router.get("/filter", verifyToken, filterVendors);

router.get("/", verifyToken, getAllVendors);

router.get("/:id/dashboard", verifyToken, getVendorDetailsDashboard);

router.get("/:id", verifyToken, getVendorById);

router.put("/:id", verifyToken, updateVendor);

router.delete("/:id", verifyToken, deleteVendor);

module.exports = router;