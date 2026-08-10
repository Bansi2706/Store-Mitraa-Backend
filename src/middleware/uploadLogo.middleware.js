const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const ownerId = req.owner?.id;

      if (!ownerId) {
        return cb(new Error("Owner ID not found"));
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

      // Make owner name safe for folder name
      const safeOwnerName = ownerName
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      // owner_1_Test
      const ownerFolder = `owner_${ownerId}_${safeOwnerName}`;

      const uploadPath = path.join(
        __dirname,
        "../../uploads/owners",
        ownerFolder
      );

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    cb(null, `owner_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only JPG, JPEG, PNG and WEBP images are allowed"),
      false
    );
  }
};

const uploadLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

module.exports = uploadLogo;