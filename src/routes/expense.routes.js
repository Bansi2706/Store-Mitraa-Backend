const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");

const {
  createExpense,
  getAllExpenses,
  searchExpenses,
  getExpensesByRange,
  getExpenseById,
  updateExpense,
  getExpenseDashboard,
  deleteExpense
} = require("../controllers/expense.controller");

router.post("/", verifyToken, createExpense);

router.get("/", verifyToken, getAllExpenses);

router.get("/by-range", verifyToken, getExpensesByRange);

router.get("/search", verifyToken, searchExpenses);

router.get("/dashboard", verifyToken, getExpenseDashboard);

router.get("/:id", verifyToken, getExpenseById);

router.put("/:id", verifyToken, updateExpense);

router.delete("/:id", verifyToken, deleteExpense);

module.exports = router;