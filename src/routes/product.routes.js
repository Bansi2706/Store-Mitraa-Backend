const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const {
  createProduct,
  getAllProducts,
  getProductById,
  searchProducts,
  updateProduct,
  deleteProduct,
  getProductDashboard,
  filterProducts
} = require("../controllers/product.controller");

router.post("/", verifyToken, upload.array("images", 5), createProduct);


router.get("/dashboard", verifyToken, getProductDashboard);

router.get("/filter", verifyToken, filterProducts);

router.get("/search", verifyToken, searchProducts);

router.get("/", verifyToken, getAllProducts);

router.get("/:id", verifyToken, getProductById);

router.put("/:id", verifyToken, upload.array("images", 5), updateProduct);

router.delete("/:id", verifyToken, deleteProduct);

module.exports = router;