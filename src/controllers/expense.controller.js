const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const expensePostQueries = require("../config/expenseQueries/expensePostQueries");
const expenseGetQueries = require("../config/expenseQueries/expenseGetQueries");
const expensePutQueries = require("../config/expenseQueries/expensePutQueries");
const expenseDeleteQueries = require("../config/expenseQueries/expenseDeleteQueries");

const createExpense = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const {
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
  } = req.body;

  await db.query(expensePostQueries.createExpense, [
    owner_id,
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
  ]);

  res.status(201).json({
    success: true,
    message: "Expense created successfully",
  });
});

const getAllExpenses = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [expenses] = await db.query(
    expenseGetQueries.getAllExpenses,
    [owner_id]
  );

  res.status(200).json({
    success: true,
    data: expenses,
  });
});

const getExpensesByRange = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
 
  const allowedRanges = ["week", "month", "all"];
  const range = allowedRanges.includes(req.query.range)
    ? req.query.range
    : "all";
 
  let listQuery = expenseGetQueries.getAllExpensesAll;
 
  if (range === "week") {
    listQuery = expenseGetQueries.getAllExpensesWeek;
  } else if (range === "month") {
    listQuery = expenseGetQueries.getAllExpensesMonth;
  }
 
  const [expenses] = await db.query(listQuery, [owner_id]);
 
  res.status(200).json({
    success: true,
    data: {
      items: expenses,
      total: expenses.length,
    },
  });
});

const getExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [expense] = await db.query(
    expenseGetQueries.getExpenseById,
    [id, owner_id]
  );

  if (expense.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Expense not found",
    });
  }

  res.status(200).json({
    success: true,
    data: expense[0],
  });
});

const searchExpenses = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
 
  const {
    keyword = "",
    category = "",
    payment_mode = "",
    range = "",
  } = req.query;
 
  let query = expenseGetQueries.searchExpenses;
  const values = [owner_id];
 
  if (keyword.trim()) {
    query += `
      AND (
        title LIKE ?
        OR notes LIKE ?
        OR payment_mode LIKE ?
      )
    `;
 
    const search = `%${keyword.trim()}%`;
    values.push(search, search, search);
  }
 
  if (category && category.toLowerCase() !== "all") {
    query += ` AND category = ? `;
    values.push(category);
  }
 
  if (payment_mode && payment_mode.toLowerCase() !== "all") {
    query += ` AND payment_mode = ? `;
    values.push(payment_mode);
  }
 
  if (range === "week") {
    query += ` AND YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1) `;
  } else if (range === "month") {
    query += `
      AND YEAR(expense_date) = YEAR(CURDATE())
      AND MONTH(expense_date) = MONTH(CURDATE())
    `;
  }
  // range === "all" ya empty ho toh koi date filter nahi
 
  query += ` ORDER BY expense_date DESC, id DESC `;
 
  const [expenses] = await db.query(query, values);
 
  const visibleTotal = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
 
  res.status(200).json({
    success: true,
    data: {
      items: expenses,
      total: expenses.length,
      visible_total: visibleTotal.toFixed(2),
    },
  });
});

const getExpenseDashboard = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
 
  // sirf 3 valid values allow karo, warna default "all"
  const allowedRanges = ["week", "month", "all"];
  const range = allowedRanges.includes(req.query.range)
    ? req.query.range
    : "all";
 
  // ===== SUMMARY (weekly_total/monthly_total hamesha fixed rehte hai) =====
  const [summary] = await db.query(
    expenseGetQueries.getExpenseSummary,
    [owner_id, owner_id, owner_id, owner_id, owner_id]
  );
 
  const summaryData = summary[0];
 
  // range ke hisaab se range_total/range_count/average_expense decide karo
  let rangeTotal;
  let rangeCount;
  let averageExpense;
 
  if (range === "week") {
    rangeTotal = Number(summaryData.weekly_total);
    rangeCount = Number(summaryData.weekly_count);
  } else if (range === "month") {
    rangeTotal = Number(summaryData.monthly_total);
    rangeCount = Number(summaryData.monthly_count);
  } else {
    rangeTotal = Number(summaryData.range_total);
    rangeCount = Number(summaryData.range_count);
  }
 
  averageExpense = rangeCount === 0 ? 0 : rangeTotal / rangeCount;
 
  // ===== CATEGORIES (range-wise query select karo) =====
  let categoryQuery = expenseGetQueries.getCategoryBreakdownAll;
 
  if (range === "week") {
    categoryQuery = expenseGetQueries.getCategoryBreakdownWeek;
  } else if (range === "month") {
    categoryQuery = expenseGetQueries.getCategoryBreakdownMonth;
  }
 
  const [categories] = await db.query(categoryQuery, [owner_id]);
 
  const categoryData = categories.map((item) => ({
    category: item.category,
    total: item.total,
    count: item.count,
    percentage:
      rangeTotal === 0
        ? 0
        : Number(((item.total / rangeTotal) * 100).toFixed(2)),
  }));
 
  // ===== TREND (range-wise: week -> MON..SUN, month -> 01..31, all -> last 6 months) =====
  const now = new Date();
  let trend = [];
 
  if (range === "week") {
    const [weekTrend] = await db.query(
      expenseGetQueries.getExpenseTrendWeek,
      [owner_id]
    );
 
    const weekLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    trend = weekLabels.map((label) => ({ label, total: 0 }));
 
    weekTrend.forEach((row) => {
      if (trend[row.day_index]) {
        trend[row.day_index].total = Number(row.total);
      }
    });
  } else if (range === "month") {
    const [monthTrend] = await db.query(
      expenseGetQueries.getExpenseTrendMonth,
      [owner_id]
    );
 
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
 
    for (let d = 1; d <= daysInMonth; d++) {
      trend.push({ label: String(d).padStart(2, "0"), total: 0 });
    }
 
    monthTrend.forEach((row) => {
      const idx = row.day_num - 1;
      if (trend[idx]) {
        trend[idx].total = Number(row.total);
      }
    });
  } else {
    const [allTrend] = await db.query(
      expenseGetQueries.getExpenseTrendAll,
      [owner_id]
    );
 
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
 
      trend.push({
        label: date
          .toLocaleString("en-US", { month: "short" })
          .toUpperCase(),
        total: 0,
      });
    }
 
    allTrend.forEach((item) => {
      const month = item.label.toUpperCase();
 
      const found = trend.find((m) => m.label === month);
 
      if (found) {
        found.total = Number(item.total);
      }
    });
  }
 
  res.status(200).json({
    success: true,
    data: {
      selected_range: range,
 
      weekly_total: summaryData.weekly_total,
      weekly_count: summaryData.weekly_count,
 
      monthly_total: summaryData.monthly_total,
      monthly_count: summaryData.monthly_count,
 
      range_total: rangeTotal.toFixed(2),
      range_count: rangeCount,
 
      average_expense: averageExpense.toFixed(2),
 
      categories: categoryData,
 
      trend,
    },
  });
});
 
const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const {
    title,
    category,
    amount,
    payment_mode,
    expense_date,
    notes,
  } = req.body;

  const [result] = await db.query(
    expensePutQueries.updateExpense,
    [
      title,
      category,
      amount,
      payment_mode,
      expense_date,
      notes,
      id,
      owner_id,
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Expense not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Expense updated successfully",
  });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owner_id = req.owner.id;

  const [result] = await db.query(
    expenseDeleteQueries.deleteExpense,
    [id, owner_id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Expense not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Expense deleted successfully",
  });
});

module.exports = {
  createExpense,
  getAllExpenses,
  getExpensesByRange,
  searchExpenses,
  getExpenseById,
  getExpenseDashboard,
  updateExpense,
  deleteExpense
};