const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const ownerId = req.owner.id;
      const productName = req.body.product_name;

      if (!productName) {
        return cb(new Error("Product name is required"));
      }

      // Get owner name
      const [owners] = await db.query(
        `SELECT owner_name FROM owners WHERE id = ?`,
        [ownerId]
      );

      if (owners.length === 0) {
        return cb(new Error("Owner not found"));
      }

      const ownerName = owners[0].owner_name;

      // Make folder names safe
      const safeOwnerName = ownerName
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      const safeProductName = productName
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      const uploadPath = path.join(
        __dirname,
        "../../uploads/products",
        safeOwnerName,
        safeProductName
      );

      // Create folders
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      uniqueName + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;