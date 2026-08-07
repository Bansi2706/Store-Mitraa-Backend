const express = require("express");
const router = express.Router();

const { getDashboardOverview } = require("../controllers/dashboard.controller");
const verifyToken = require("../middleware/auth.middleware");

router.get("/overview", verifyToken, getDashboardOverview);

module.exports = router;