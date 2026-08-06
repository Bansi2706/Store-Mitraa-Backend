const { verifyAccessToken } = require("../utils/jwt");

const verifyToken = (req, res, next) => {
  try {
    // Get Authorization Header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token not provided.",
      });
    }

    // Get Token
    const token = authHeader.split(" ")[1];

    // Verify Token
    const decoded = verifyAccessToken(token);

    // Save Owner Data
    req.owner = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = verifyToken;