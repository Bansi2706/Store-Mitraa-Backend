const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const fs = require("fs");
const path = require("path");

const productPostQueries = require("../config/productQueries/productPostQueries");
const productGetQueries = require("../config/productQueries/productGetQueries");
const productPutQueries = require("../config/productQueries/productPutQueries");
const productDeleteQueries = require("../config/productQueries/productDeleteQueries");

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

  // Product Image
  const product_image =
    req.files && req.files.length > 0 ? req.files[0].filename : null;

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
      await db.query(
        `INSERT INTO product_images
      (
        product_id,
        image_url,
        is_main,
        display_order
      )
      VALUES (?, ?, ?, ?)`,
        [product_id, req.files[i].filename, i === 0, i + 1],
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

  const [products] = await db.query(productGetQueries.getAllProducts, [
    owner_id,
  ]);

  res.status(200).json({
    success: true,
    data: products,
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

  res.status(200).json({
    success: true,
    data: products,
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

  // Remove images user deleted
  if (deleted_image_ids) {
    const idsToDelete = Array.isArray(deleted_image_ids)
      ? deleted_image_ids
      : JSON.parse(deleted_image_ids);

    for (const imgId of idsToDelete) {
      // fetch filename before deleting row
      const [imgRows] = await db.query(
        `SELECT image_url FROM product_images WHERE id = ? AND product_id = ?`,
        [imgId, id],
      );

      if (imgRows.length > 0) {
        await db.query(productPutQueries.deleteProductImage, [imgId, id]);

        const filePath = path.join(
          __dirname,
          "../../uploads/products",
          imgRows[0].image_url,
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }

  // Add newly uploaded images
  if (req.files && req.files.length > 0) {
    const [existingImages] = await db.query(
      productPutQueries.getProductImages,
      [id],
    );
    const startOrder = existingImages.length;
    const hadNoImagesBefore = existingImages.length === 0;

    for (let i = 0; i < req.files.length; i++) {
      const isMain = hadNoImagesBefore && i === 0;

      await db.query(productPutQueries.addProductImage, [
        id,
        req.files[i].filename,
        isMain,
        startOrder + i + 1,
      ]);

      // keep products.product_image in sync if this is now the main image
      if (isMain) {
        await db.query(productPutQueries.updateMainProductImage, [
          req.files[i].filename,
          id,
        ]);
      }
    }
  }

  // Change Main Image
  if (main_image) {
    await db.query(productPutQueries.resetMainImage, [id]);

    await db.query(productPutQueries.setMainImage, [main_image, id]);

    const [[image]] = await db.query(productPutQueries.getImageById, [
      main_image,
      id,
    ]);

    if (image) {
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

  // Clean up files from disk
  images.forEach((img) => {
    const filePath = path.join(
      __dirname,
      "../../uploads/products",
      img.image_url,
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
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

  const {
    q,
    category,
    status,
    sort,
  } = req.query;

  let query = `
    SELECT *,
      CASE
        WHEN stock_quantity = 0 THEN 'Out of Stock'
        WHEN stock_quantity <= low_stock_threshold THEN 'Low Stock'
        ELSE 'In Stock'
      END AS stock_status
    FROM products
    WHERE owner_id = ?
  `;

  const values = [owner_id];

  // Search
  if (q) {
    query += `
      AND (
        product_name LIKE ?
        OR product_sku LIKE ?
      )
    `;

    values.push(`%${q}%`, `%${q}%`);
  }

  // Category
  if (category && category !== "All Categories") {
    query += ` AND product_category = ?`;
    values.push(category);
  }

  // Stock Status
  if (status) {
    query += `
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

  // Sorting
  switch (sort) {
    case "oldest":
      query += " ORDER BY id ASC";
      break;

    case "name_asc":
      query += " ORDER BY product_name ASC";
      break;

    case "name_desc":
      query += " ORDER BY product_name DESC";
      break;

    default:
      query += " ORDER BY id DESC";
  }

  const [products] = await db.query(query, values);

  return res.status(200).json({
    success: true,
    data: products,
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
