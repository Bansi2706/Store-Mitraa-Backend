const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth.middleware");
const uploadLogo = require("../middleware/uploadLogo.middleware");
const uploadLogoRegister = require("../middleware/uploadLogoRegister.middleware");

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
router.post("/register",  uploadLogoRegister.single("logo"), register);

router.post("/login", login);

router.post( "/forgot-password",forgotPassword);

router.get("/profile", verifyToken, getProfile);

router.put( "/profile", verifyToken, uploadLogo.single("logo"), updateProfile );

router.put("/change-password", verifyToken, updatePassword);

router.post("/verify-otp", verifyOTP);

router.put("/reset-password", resetPassword);

router.post("/logout", verifyToken, logout);

router.delete("/delete", verifyToken, deleteAccount);

module.exports = router;