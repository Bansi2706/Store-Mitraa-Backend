const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const fs = require("fs");
const path = require("path");

const productPostQueries = require("../config/productQueries/productPostQueries");
const productGetQueries = require("../config/productQueries/productGetQueries");
const productPutQueries = require("../config/productQueries/productPutQueries");
const productDeleteQueries = require("../config/productQueries/productDeleteQueries");

// Builds the same safe folder name used by the multer destination logic
const buildSafeName = (str) =>
  str
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// Builds the relative path (owner_<id>_<name>/product_folder/filename) — this
// must exactly match the folder structure created by upload.middleware.js,
// and is what gets stored in the DB (product_images.image_url, products.product_image)
const buildProductImageRelativePath = (ownerId, ownerName, productName, filename) => {
  const safeOwnerName = buildSafeName(ownerName);
  const ownerFolder = `owner_${ownerId}_${safeOwnerName}`;
  const safeProductName = buildSafeName(productName);
  return `${ownerFolder}/${safeProductName}/${filename}`;
};

// Prepends the public URL prefix for use in API responses
const toPublicImageUrl = (relativePath) =>
  relativePath ? `/uploads/products/${relativePath}` : null;

// Attaches full public image URLs to a product row (and its images array, if present)
const attachImageUrls = (product) => {
  if (!product) return product;

  if (product.product_image) {
    product.product_image = toPublicImageUrl(product.product_image);
  }

  if (Array.isArray(product.images)) {
    product.images = product.images.map((img) => ({
      ...img,
      image_url: toPublicImageUrl(img.image_url),
    }));
  }

  return product;
};

// Safely deletes a physical file (relative path under uploads/products) if it exists.
// Bhi cleans up the product's folder if it becomes empty after this deletion,
// so we don't leave behind stray empty folders (e.g. "abcd" folder sitting
// around after all of its images — and the product itself — are gone).
const deletePhysicalImage = (relativePath) => {
  if (!relativePath) return;

  const filePath = path.join(__dirname, "../../uploads/products", relativePath);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const folderPath = path.dirname(filePath);

  if (fs.existsSync(folderPath)) {
    try {
      const remainingFiles = fs.readdirSync(folderPath);
      if (remainingFiles.length === 0) {
        fs.rmdirSync(folderPath);
      }
    } catch (err) {
      // Folder cleanup is best-effort — don't fail the request over it
      console.error("Failed to clean up empty product folder:", folderPath, err);
    }
  }
};

const createProduct = asyncHandler(async (req, res) => {
  const {
    product_name,
    product_description,
    product_category,
    product_sku,
    buying_price,
    product_mrp,
    stock_quantity,
    low_stock_threshold,
    product_unit,
  } = req.body;

  const owner_id = req.owner.id;

  // Check SKU
  const [skuExists] = await db.query(productPostQueries.checkSku, [
    product_sku,
  ]);

  if (skuExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Product SKU already exists",
    });
  }

  // Need owner_name to build the same relative path multer used on disk
  const [owners] = await db.query(
    `SELECT owner_name FROM owners WHERE id = ?`,
    [owner_id]
  );

  if (owners.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Owner not found",
    });
  }

  const ownerName = owners[0].owner_name;

  // Product Image — store relative path (owner/product/filename), not just filename
  const product_image =
    req.files && req.files.length > 0
      ? buildProductImageRelativePath(
          owner_id,
          ownerName,
          product_name,
          req.files[0].filename
        )
      : null;

  // Create Product
  const [result] = await db.query(productPostQueries.createProduct, [
    owner_id,
    product_name,
    product_description,
    product_category,
    product_sku,
    buying_price,
    product_mrp,
    stock_quantity,
    low_stock_threshold,
    product_unit,
    product_image,
  ]);

  const product_id = result.insertId;

  if (req.files && req.files.length > 0) {
    for (let i = 0; i < req.files.length; i++) {
      const relativePath = buildProductImageRelativePath(
        owner_id,
        ownerName,
        product_name,
        req.files[i].filename
      );

      await db.query(
        `INSERT INTO product_images
      (
        product_id,
        image_url,
        is_main,
        display_order
      )
      VALUES (?, ?, ?, ?)`,
        [product_id, relativePath, i === 0, i + 1],
      );
    }
  }

  res.status(201).json({
    success: true,
    message: "Product created successfully",
  });
});

const getAllProducts = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  const [products] = await db.query(productGetQueries.getAllProducts, [
    owner_id,
    limit,
    offset,
  ]);

  const [countResult] = await db.query(productGetQueries.getProductsCount, [
    owner_id,
  ]);

  const totalRecords = countResult[0].total;
  const totalPages = Math.ceil(totalRecords / limit);

  const productsWithUrls = products.map((p) => attachImageUrls({ ...p }));

  res.status(200).json({
    success: true,
    data: productsWithUrls,
    pagination: {
      currentPage: page,
      totalPages,
      totalRecords,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [product] = await db.query(productGetQueries.getProductById, [
    id,
    owner_id,
  ]);

  if (product.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const [images] = await db.query(productGetQueries.getProductImages, [id]);

  const productData = product[0];
  productData.images = images;

  attachImageUrls(productData);

  res.status(200).json({
    success: true,
    data: productData,
  });
});

const searchProducts = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: "Search keyword is required",
    });
  }

  const search = `%${q}%`;

  const [products] = await db.query(
    productGetQueries.searchProducts,
    [owner_id, search, search]
  );

  const productsWithUrls = products.map((p) => attachImageUrls({ ...p }));

  res.status(200).json({
    success: true,
    data: productsWithUrls,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const {
    product_name,
    product_description,
    product_category,
    product_sku,
    buying_price,
    product_mrp,
    stock_quantity,
    low_stock_threshold,
    product_unit,
    deleted_image_ids,
    main_image,
  } = req.body;

  // 404 check: product exist karta hai ya nahi (aur ye owner ka hi hai)
  const [existingProductRows] = await db.query(
    `SELECT id FROM products WHERE id = ? AND owner_id = ?`,
    [id, owner_id],
  );

  if (existingProductRows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // SKU uniqueness check (excluding this product)
  const [skuExists] = await db.query(productPutQueries.checkSkuExcludingSelf, [
    product_sku,
    id,
    owner_id,
  ]);

  if (skuExists.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Product SKU already exists",
    });
  }

  // Update main product row
  const [result] = await db.query(productPutQueries.updateProduct, [
    product_name,
    product_description,
    product_category,
    product_sku,
    buying_price,
    product_mrp,
    stock_quantity,
    low_stock_threshold,
    product_unit,
    id,
    owner_id,
  ]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Remove images user explicitly deleted (no replacement upload for these)
  if (deleted_image_ids) {
    const idsToDelete = Array.isArray(deleted_image_ids)
      ? deleted_image_ids
      : JSON.parse(deleted_image_ids);

    for (const imgId of idsToDelete) {
      // fetch filename + main status before deleting row
      const [imgRows] = await db.query(
        `SELECT image_url, is_main FROM product_images WHERE id = ? AND product_id = ?`,
        [imgId, id],
      );

      if (imgRows.length > 0) {
        const wasMain = !!imgRows[0].is_main;

        await db.query(productPutQueries.deleteProductImage, [imgId, id]);

        // image_url stores the relative path (owner/product/filename) —
        // this is what actually removes it from the uploads folder on disk.
        deletePhysicalImage(imgRows[0].image_url);

        // 👇 Agar delete hui image hi MAIN image thi, to "No Main Image"
        // hone se bachane ke liye agli baaki bachi image ko naya main
        // bana do. Koi image na bache to product_image ko null kar do.
        if (wasMain) {
          const [nextMain] = await db.query(
            `SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY display_order ASC LIMIT 1`,
            [id],
          );

          if (nextMain.length > 0) {
            await db.query(
              `UPDATE product_images SET is_main = 1 WHERE id = ?`,
              [nextMain[0].id],
            );

            await db.query(productPutQueries.updateMainProductImage, [
              nextMain[0].image_url,
              id,
            ]);
          } else {
            await db.query(productPutQueries.updateMainProductImage, [
              null,
              id,
            ]);
          }
        }
      }
    }
  }

  // Add newly uploaded images
  if (req.files && req.files.length > 0) {
    // Need owner_name to build the same relative path multer used on disk
    const [owners] = await db.query(
      `SELECT owner_name FROM owners WHERE id = ?`,
      [owner_id]
    );
    const ownerName = owners[0]?.owner_name;

    // 👇 Fresh check: kitni images ab bhi bachi hain (deleted_image_ids wala
    // block upar already chal chuka hai, is se count updated milega).
    // Agar KOI bhi image bachi nahi hai, tabhi naya upload "main" banega —
    // warna sirf gallery mein add hoga, existing main image untouched rahegi.
    const [remainingImages] = await db.query(
      productPutQueries.getProductImages,
      [id],
    );
    const hasNoImagesLeft = remainingImages.length === 0;
    let nextOrder = remainingImages.length;

    for (let i = 0; i < req.files.length; i++) {
      const relativePath = buildProductImageRelativePath(
        owner_id,
        ownerName,
        product_name,
        req.files[i].filename
      );

      // Sirf tab main banega jab pehle se koi image na ho AUR ye pehla
      // naya file ho. Agar images pehle se maujood hain, naya upload
      // sirf gallery mein add hoga — purani main image change nahi hogi.
      const isMain = hasNoImagesLeft && i === 0;
      nextOrder += 1;

      await db.query(productPutQueries.addProductImage, [
        id,
        relativePath,
        isMain,
        nextOrder,
      ]);

      if (isMain) {
        await db.query(productPutQueries.updateMainProductImage, [
          relativePath,
          id,
        ]);
      }
    }
  }

  // Change Main Image (pick an existing image as main, no new upload)
  if (main_image) {
    await db.query(productPutQueries.resetMainImage, [id]);

    await db.query(productPutQueries.setMainImage, [main_image, id]);

    const [[image]] = await db.query(productPutQueries.getImageById, [
      main_image,
      id,
    ]);

    if (image) {
      // image.image_url already stores the relative path — keep as-is
      await db.query(productPutQueries.updateMainProductImage, [
        image.image_url,
        id,
      ]);
    }
  }

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  // Get image filenames before deleting anything
  const [images] = await db.query(productDeleteQueries.getProductImages, [id]);

  // Delete the product (owner_id check ensures ownership)
  const [result] = await db.query(productDeleteQueries.deleteProduct, [
    id,
    owner_id,
  ]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Clean up files from disk (image_url stores the relative path)
  images.forEach((img) => {
    deletePhysicalImage(img.image_url);
  });

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});

const getProductDashboard = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [result] = await db.query(
    productGetQueries.getProductDashboard,
    [owner_id]
  );

  return res.status(200).json({
    success: true,
    data: result[0],
  });
});

const filterProducts = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const { q, category, status, sort } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;

  let baseCondition = `WHERE owner_id = ?`;
  const values = [owner_id];

  // Search
  if (q) {
    baseCondition += `
      AND (
        product_name LIKE ?
        OR product_sku LIKE ?
      )
    `;
    values.push(`%${q}%`, `%${q}%`);
  }

  // Category
  if (category && category !== "All Categories") {
    baseCondition += ` AND product_category = ?`;
    values.push(category);
  }

  // Stock Status
  if (status) {
    baseCondition += `
      AND (
        CASE
          WHEN stock_quantity = 0 THEN 'Out of Stock'
          WHEN stock_quantity <= low_stock_threshold THEN 'Low Stock'
          ELSE 'In Stock'
        END
      ) = ?
    `;
    values.push(status);
  }

  // Count query (same filters, without sort/limit)
  const countQuery = `SELECT COUNT(*) AS total FROM products ${baseCondition}`;
  const [countResult] = await db.query(countQuery, values);
  const totalRecords = countResult[0].total;
  const totalPages = Math.ceil(totalRecords / limit);

  // Sorting
  let orderBy = " ORDER BY id DESC";
  switch (sort) {
    case "oldest":
      orderBy = " ORDER BY id ASC";
      break;
    case "name_asc":
      orderBy = " ORDER BY product_name ASC";
      break;
    case "name_desc":
      orderBy = " ORDER BY product_name DESC";
      break;
  }

  const dataQuery = `
    SELECT *,
      CASE
        WHEN stock_quantity = 0 THEN 'Out of Stock'
        WHEN stock_quantity <= low_stock_threshold THEN 'Low Stock'
        ELSE 'In Stock'
      END AS stock_status
    FROM products
    ${baseCondition}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const [products] = await db.query(dataQuery, [...values, limit, offset]);

  const productsWithUrls = products.map((p) => attachImageUrls({ ...p }));

  return res.status(200).json({
    success: true,
    data: productsWithUrls,
    pagination: {
      currentPage: page,
      totalPages,
      totalRecords,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  searchProducts,
  filterProducts,
  updateProduct,
  deleteProduct,
  getProductDashboard,
};