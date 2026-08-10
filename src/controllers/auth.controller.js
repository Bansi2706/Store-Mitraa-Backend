const bcrypt = require("bcrypt");
const db = require("../config/db");

const crypto = require("crypto");

const authGetQueries = require("../config/authQueries/authGetQueries");
const authPostQueries = require("../config/authQueries/authPostQueries");
const authPutQueries = require("../config/authQueries/authPutQueries");
const authDeleteQueries = require("../config/authQueries/authDeleteQueries");

const asyncHandler = require("../utils/asyncHandler");
const { signAccessToken } = require("../utils/jwt");
const sendEmail = require("../utils/sendEmail");

const register = asyncHandler(async (req, res) => {
  const { shop_name, owner_name, email, phone, whatsapp, address, password } =
    req.body;

  const [emailExists] = await db.query(authPostQueries.checkEmail, [email]);

  if (emailExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Email already exists",
    });
  }

  const [phoneExists] = await db.query(authPostQueries.checkPhone, [phone]);

  if (phoneExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Phone number already exists",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const logo = req.file ? req.file.filename : null;

  await db.query(authPostQueries.register, [
    shop_name,
    owner_name,
    email,
    phone,
    whatsapp,
    address,
    logo,
    hashedPassword,
  ]);

  res.status(201).json({
    success: true,
    message: "Owner registered successfully",
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const [owners] = await db.query(authPostQueries.login, [email]);

  if (owners.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const owner = owners[0];

  const isMatch = await bcrypt.compare(password, owner.password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = signAccessToken({
    id: owner.id,
    email: owner.email,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const ownerId = req.owner.id;

  const [owner] = await db.query(
    authGetQueries.getProfile,
    [ownerId]
  );

  if (owner.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Owner not found",
    });
  }

  const profile = owner[0];

 if (profile.logo) {
  const safeOwnerName = profile.owner_name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  profile.logo = `/uploads/owners/owner_${ownerId}_${safeOwnerName}/${profile.logo}`;
}

  res.status(200).json({
    success: true,
    data: profile,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const ownerId = req.owner.id;

  const {
    shop_name,
    owner_name,
    phone,
    whatsapp,
    address,
    language,
    timezone,
    two_factor_enabled,
  } = req.body;

  // Get current profile
  const [owners] = await db.query(authGetQueries.getProfile, [ownerId]);

  if (owners.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Owner not found",
    });
  }

  const owner = owners[0];

  // Keep old logo if new logo not uploaded
  const logo = req.file ? req.file.filename : owner.logo;

  // 👇 Fallback for other fields too — empty string ya undefined aane par purani value use karo
  const finalShopName = shop_name?.trim() ? shop_name.trim() : owner.shop_name;
  const finalOwnerName = owner_name?.trim() ? owner_name.trim() : owner.owner_name;
  const finalPhone = phone?.trim() ? phone.trim() : owner.phone;
  const finalWhatsapp = whatsapp?.trim() ? whatsapp.trim() : owner.whatsapp;
  const finalAddress = address?.trim() ? address.trim() : owner.address;

  // Update Profile
  await db.query(authPutQueries.updateProfile, [
    finalShopName,
    finalOwnerName,
    finalPhone,
    finalWhatsapp,
    finalAddress,
    logo,
    language,
    timezone,
    two_factor_enabled,
    ownerId,
  ]);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
});

const updatePassword = asyncHandler(async (req, res) => {
  const ownerId = req.owner.id;

  const { current_password, new_password, confirm_password } = req.body;

  // Validation
  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }

  const [owners] = await db.query(authPostQueries.login, [req.owner.email]);

  const owner = owners[0];

  const isMatch = await bcrypt.compare(current_password, owner.password);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);

  await db.query(authPutQueries.updatePassword, [hashedPassword, ownerId]);

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const [owners] = await db.query(authPostQueries.checkForgotEmail, [email]);

  if (owners.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Email not found",
    });
  }

  const owner = owners[0];

  // Delete old OTP
  await db.query(authDeleteQueries.deleteOldOTP, [owner.id]);

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Expiry = 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Save OTP
  await db.query(authPostQueries.saveOTP, [owner.id, otp, expiresAt]);

  await sendEmail(
    owner.email,
    "Store Mitraa - Password Reset OTP",
    `
    <h2>Password Reset</h2>

    <p>Hello ${owner.owner_name},</p>

    <p>Your OTP is:</p>

    <h1>${otp}</h1>

    <p>This OTP is valid for 10 minutes.</p>

    <p>If you did not request this, please ignore this email.</p>
  `,
  );

  res.status(200).json({
    success: true,
    message: "OTP sent successfully",
  });
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const [rows] = await db.query(authPostQueries.verifyOTP, [email, otp]);

  if (rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }

  const reset = rows[0];

  if (new Date() > new Date(reset.expires_at)) {
    return res.status(400).json({
      success: false,
      message: "OTP has expired",
    });
  }

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const {
    email,
    otp,
    new_password,
    confirm_password,
  } = req.body;

  if (
    !email ||
    !otp ||
    !new_password ||
    !confirm_password
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }

  const [rows] = await db.query(
    authPostQueries.verifyResetOTP,
    [email, otp]
  );

  if (rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }

  const reset = rows[0];

  if (new Date() > new Date(reset.expires_at)) {
    return res.status(400).json({
      success: false,
      message: "OTP has expired",
    });
  }

  const hashedPassword = await bcrypt.hash(
    new_password,
    10
  );

  await db.query(
    authPutQueries.resetPassword,
    [
      hashedPassword,
      reset.owner_id,
    ]
  );

  await db.query(
    authDeleteQueries.deleteOTP,
    [reset.owner_id]
  );

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const ownerId = req.owner.id;

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  // Get Owner
  const [owners] = await db.query(
    authGetQueries.getProfile,
    [ownerId]
  );

  if (owners.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Owner not found",
    });
  }

  // Get password
  const [ownerData] = await db.query(
    authPostQueries.login,
    [owners[0].email]
  );

  const owner = ownerData[0];

  const isMatch = await bcrypt.compare(
    password,
    owner.password
  );

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: "Incorrect password",
    });
  }

  // Delete Owner
  await db.query(
    authDeleteQueries.deleteOwner,
    [ownerId]
  );

  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
});

module.exports = {
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
};
