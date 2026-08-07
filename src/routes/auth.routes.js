const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth.middleware");
const uploadLogo = require("../middleware/uploadLogo.middleware");

const {
  register,
  login,
  getProfile,
  updateProfile,
  updatePassword,
  logout
} = require("../controllers/auth.controller");

// Register, login
router.post("/register", register);

router.post("/login", login);

router.get("/profile", verifyToken, getProfile);

router.put( "/profile", verifyToken, uploadLogo.single("logo"), updateProfile );

router.put("/change-password", verifyToken, updatePassword);

router.post("/logout", verifyToken, logout);

module.exports = router;