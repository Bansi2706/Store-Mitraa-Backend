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
  forgotPassword,
  verifyOTP,
  resetPassword,
  logout,
  deleteAccount
} = require("../controllers/auth.controller");

// Register, login
router.post("/register", register);

router.post("/login", login);

router.post( "/forgot-password",forgotPassword);

router.get("/profile", verifyToken, getProfile);

router.put( "/profile", verifyToken, uploadLogo.single("logo"), updateProfile );

router.put("/change-password", verifyToken, updatePassword);

router.post("/verify-otp", verifyOTP);

router.put("/reset-password", resetPassword);

router.post("/logout", verifyToken, logout);

router.delete("/delete-account", verifyToken, deleteAccount);

module.exports = router;