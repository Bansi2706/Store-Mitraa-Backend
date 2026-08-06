const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
app.set("json spaces", 2);

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const vendorRoutes = require("./routes/vendor.routes");
const vendorBillRoutes = require("./routes/vendorBill.routes");
const customerRoutes = require("./routes/customer.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const expenseRoutes = require("./routes/expense.routes");

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads"));


// Test Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Store Mitraa Backend API is Running...",
  });
});


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/vendor-bills", vendorBillRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/expenses", expenseRoutes);

module.exports = app;