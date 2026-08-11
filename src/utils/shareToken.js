const crypto = require("crypto");

const SECRET = process.env.INVOICE_SHARE_SECRET || "change_this_secret_key_123";

// Invoice id se ek unguessable token generate karta hai
function generateShareToken(invoiceId) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(String(invoiceId))
    .digest("hex")
    .slice(0, 20);
}

// Public route pe verify karne ke liye
function verifyShareToken(invoiceId, token) {
  if (!token) return false;
  const expected = generateShareToken(invoiceId);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

module.exports = { generateShareToken, verifyShareToken };