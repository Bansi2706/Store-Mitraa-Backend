const bcrypt = require("bcrypt");
const db = require("../config/db");

const authGetQueries = require("../config/authQueries/authGetQueries");
const authPostQueries = require("../config/authQueries/authPostQueries");
const authPutQueries = require("../config/authQueries/authPutQueries");

const asyncHandler = require("../utils/asyncHandler");
const { signAccessToken } = require("../utils/jwt");

const register = asyncHandler(async (req, res) => {
  const {
    shop_name,
    owner_name,
    email,
    phone,
    whatsapp,
    address,
    password,
  } = req.body;

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

  const [owner] = await db.query(authGetQueries.getProfile, [ownerId]);

  if (owner.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Owner not found",
    });
  }

  res.status(200).json({
    success: true,
    data: owner[0],
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
  } = req.body;

  // Get current profile
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

  const owner = owners[0];

  // Keep old logo if new logo not uploaded
  const logo = req.file ? req.file.filename : owner.logo;

  // Update Profile
  await db.query(authPutQueries.updateProfile, [
    shop_name,
    owner_name,
    phone,
    whatsapp,
    address,
    logo,
    ownerId,
  ]);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};