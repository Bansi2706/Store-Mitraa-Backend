const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const reportsGetQueries = require("../config/reportsQueries/reportsGetQueries");

const getReportsOverview = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const [[invoiceSummary]] = await db.query(
    reportsGetQueries.getInvoiceSummary,
    [owner_id]
  );

  const [[expenseRow]] = await db.query(reportsGetQueries.getTotalExpenses, [
    owner_id,
  ]);

  const [[payablesRow]] = await db.query(
    reportsGetQueries.getOutstandingPayables,
    [owner_id]
  );

  const [[customerRow]] = await db.query(
    reportsGetQueries.getTotalCustomers,
    [owner_id]
  );

  const totalRevenue = Number(invoiceSummary.revenue);
  const totalProfit = Number(invoiceSummary.profit);
  const paidAmount = Number(invoiceSummary.paid_amount);
  const receivables = Number(invoiceSummary.receivables);
  const invoiceCount = Number(invoiceSummary.invoice_count);
  const activeCustomers = Number(invoiceSummary.active_customers);

  const totalExpenses = Number(expenseRow.total);
  const totalPayables = Number(payablesRow.total);
  const totalCustomers = Number(customerRow.total);

  const netProfit = totalProfit - totalExpenses;

  const collectionRate =
    totalRevenue === 0
      ? 0
      : Number(((paidAmount / totalRevenue) * 100).toFixed(2));

  const averageOrderValue =
    invoiceCount === 0 ? 0 : totalRevenue / invoiceCount;

  res.status(200).json({
    success: true,
    data: {
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      collection_rate: collectionRate,
      outstanding_receivables: receivables,
      outstanding_payables: totalPayables,
      average_order_value: averageOrderValue,
      active_customers: activeCustomers,
      total_customers: totalCustomers,
    },
  });
});

// har point ke liye net = collections - expenses nikal ke round karta hai
const buildPoint = (label, revenue, profit, expenses, collections, outstanding) => ({
  label,
  revenue: Number(revenue.toFixed(2)),
  profit: Number(profit.toFixed(2)),
  expenses: Number(expenses.toFixed(2)),
  collections: Number(collections.toFixed(2)),
  outstanding: Number(outstanding.toFixed(2)),
  net: Number((collections - expenses).toFixed(2)),
});

// GET /api/reports/sales-profit?period=weekly|monthly|quarterly|yearly
const getSalesProfitReport = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const allowedPeriods = ["weekly", "monthly", "quarterly", "yearly"];
  const period = allowedPeriods.includes(req.query.period)
    ? req.query.period
    : "weekly";

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let points = [];

  if (period === "weekly") {
    const [invoiceRows] = await db.query(
      reportsGetQueries.getInvoiceStatsByWeekday,
      [owner_id]
    );
    const [expenseRows] = await db.query(
      reportsGetQueries.getExpenseStatsByWeekday,
      [owner_id]
    );

    const dayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    points = dayLabels.map((label, index) => {
      const inv = invoiceRows.find((r) => r.bucket === index);
      const exp = expenseRows.find((r) => r.bucket === index);

      return buildPoint(
        label,
        inv ? Number(inv.revenue) : 0,
        inv ? Number(inv.profit) : 0,
        exp ? Number(exp.total) : 0,
        inv ? Number(inv.collections) : 0,
        inv ? Number(inv.outstanding) : 0
      );
    });
  } else if (period === "monthly") {
    const [invoiceRows] = await db.query(
      reportsGetQueries.getInvoiceStatsByDayOfMonth,
      [owner_id]
    );
    const [expenseRows] = await db.query(
      reportsGetQueries.getExpenseStatsByDayOfMonth,
      [owner_id]
    );

    const weekBuckets = [1, 2, 3, 4, 5].map(() => ({
      revenue: 0,
      profit: 0,
      collections: 0,
      outstanding: 0,
      expenses: 0,
    }));

    invoiceRows.forEach((row) => {
      const weekIdx = Math.min(Math.ceil(row.bucket / 7), 5) - 1;
      weekBuckets[weekIdx].revenue += Number(row.revenue);
      weekBuckets[weekIdx].profit += Number(row.profit);
      weekBuckets[weekIdx].collections += Number(row.collections);
      weekBuckets[weekIdx].outstanding += Number(row.outstanding);
    });

    expenseRows.forEach((row) => {
      const weekIdx = Math.min(Math.ceil(row.bucket / 7), 5) - 1;
      weekBuckets[weekIdx].expenses += Number(row.total);
    });

    points = weekBuckets.map((bucket, index) =>
      buildPoint(
        `W${index + 1}`,
        bucket.revenue,
        bucket.profit,
        bucket.expenses,
        bucket.collections,
        bucket.outstanding
      )
    );
  } else if (period === "quarterly") {
    const quarterStartMonth = Math.floor((currentMonth - 1) / 3) * 3 + 1;
    const quarterEndMonth = quarterStartMonth + 2;

    const [invoiceRows] = await db.query(
      reportsGetQueries.getInvoiceStatsByMonthRange,
      [owner_id, currentYear, quarterStartMonth, quarterEndMonth]
    );
    const [expenseRows] = await db.query(
      reportsGetQueries.getExpenseStatsByMonthRange,
      [owner_id, currentYear, quarterStartMonth, quarterEndMonth]
    );

    const monthLabels = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];

    points = [];
    for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
      const inv = invoiceRows.find((r) => r.bucket === m);
      const exp = expenseRows.find((r) => r.bucket === m);

      points.push(
        buildPoint(
          monthLabels[m - 1],
          inv ? Number(inv.revenue) : 0,
          inv ? Number(inv.profit) : 0,
          exp ? Number(exp.total) : 0,
          inv ? Number(inv.collections) : 0,
          inv ? Number(inv.outstanding) : 0
        )
      );
    }
  } else {
    // yearly
    const [invoiceRows] = await db.query(
      reportsGetQueries.getInvoiceStatsByMonthRange,
      [owner_id, currentYear, 1, 12]
    );
    const [expenseRows] = await db.query(
      reportsGetQueries.getExpenseStatsByMonthRange,
      [owner_id, currentYear, 1, 12]
    );

    const monthLabels = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];

    points = monthLabels.map((label, index) => {
      const m = index + 1;
      const inv = invoiceRows.find((r) => r.bucket === m);
      const exp = expenseRows.find((r) => r.bucket === m);

      return buildPoint(
        label,
        inv ? Number(inv.revenue) : 0,
        inv ? Number(inv.profit) : 0,
        exp ? Number(exp.total) : 0,
        inv ? Number(inv.collections) : 0,
        inv ? Number(inv.outstanding) : 0
      );
    });
  }

  const totalRevenue = Number(
    points.reduce((sum, p) => sum + p.revenue, 0).toFixed(2)
  );
  const totalProfit = Number(
    points.reduce((sum, p) => sum + p.profit, 0).toFixed(2)
  );
  const profitMargin =
    totalRevenue === 0
      ? 0
      : Number(((totalProfit / totalRevenue) * 100).toFixed(2));

  res.status(200).json({
    success: true,
    data: {
      period,
      points,
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      profit_margin: profitMargin,
    },
  });
});

// cashflow point banata hai - revenue/profit hamesha 0 (yeh sirf cash movement track karta hai)
const buildCashPoint = (label, expenses, collections, outstanding) => ({
  label,
  revenue: 0,
  profit: 0,
  expenses: Number(expenses.toFixed(2)),
  collections: Number(collections.toFixed(2)),
  outstanding: Number(outstanding.toFixed(2)),
  net: Number((collections - expenses).toFixed(2)),
});

// GET /api/reports/cashflow?period=weekly|monthly|quarterly|yearly
const getCashflowReport = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const allowedPeriods = ["weekly", "monthly", "quarterly", "yearly"];
  const period = allowedPeriods.includes(req.query.period)
    ? req.query.period
    : "weekly";

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let points = [];

  if (period === "weekly") {
    const [invoiceRows] = await db.query(
      reportsGetQueries.getInvoiceCashByWeekday,
      [owner_id]
    );
    const [expenseRows] = await db.query(
      reportsGetQueries.getExpenseStatsByWeekday,
      [owner_id]
    );

    const dayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    points = dayLabels.map((label, index) => {
      const inv = invoiceRows.find((r) => r.bucket === index);
      const exp = expenseRows.find((r) => r.bucket === index);

      return buildCashPoint(
        label,
        exp ? Number(exp.total) : 0,
        inv ? Number(inv.collections) : 0,
        inv ? Number(inv.outstanding) : 0
      );
    });
  } else if (period === "monthly") {
    const [invoiceRows] = await db.query(
      reportsGetQueries.getInvoiceCashByDayOfMonth,
      [owner_id]
    );
    const [expenseRows] = await db.query(
      reportsGetQueries.getExpenseStatsByDayOfMonth,
      [owner_id]
    );

    const weekBuckets = [1, 2, 3, 4, 5].map(() => ({
      collections: 0,
      outstanding: 0,
      expenses: 0,
    }));

    invoiceRows.forEach((row) => {
      const weekIdx = Math.min(Math.ceil(row.bucket / 7), 5) - 1;
      weekBuckets[weekIdx].collections += Number(row.collections);
      weekBuckets[weekIdx].outstanding += Number(row.outstanding);
    });

    expenseRows.forEach((row) => {
      const weekIdx = Math.min(Math.ceil(row.bucket / 7), 5) - 1;
      weekBuckets[weekIdx].expenses += Number(row.total);
    });

    points = weekBuckets.map((bucket, index) =>
      buildCashPoint(
        `W${index + 1}`,
        bucket.expenses,
        bucket.collections,
        bucket.outstanding
      )
    );
  } else if (period === "quarterly") {
    const quarterStartMonth = Math.floor((currentMonth - 1) / 3) * 3 + 1;
    const quarterEndMonth = quarterStartMonth + 2;

    const [invoiceRows] = await db.query(
      reportsGetQueries.getInvoiceCashByMonthRange,
      [owner_id, currentYear, quarterStartMonth, quarterEndMonth]
    );
    const [expenseRows] = await db.query(
      reportsGetQueries.getExpenseStatsByMonthRange,
      [owner_id, currentYear, quarterStartMonth, quarterEndMonth]
    );

    const monthLabels = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];

    points = [];
    for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
      const inv = invoiceRows.find((r) => r.bucket === m);
      const exp = expenseRows.find((r) => r.bucket === m);

      points.push(
        buildCashPoint(
          monthLabels[m - 1],
          exp ? Number(exp.total) : 0,
          inv ? Number(inv.collections) : 0,
          inv ? Number(inv.outstanding) : 0
        )
      );
    }
  } else {
    // yearly
    const [invoiceRows] = await db.query(
      reportsGetQueries.getInvoiceCashByMonthRange,
      [owner_id, currentYear, 1, 12]
    );
    const [expenseRows] = await db.query(
      reportsGetQueries.getExpenseStatsByMonthRange,
      [owner_id, currentYear, 1, 12]
    );

    const monthLabels = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];

    points = monthLabels.map((label, index) => {
      const m = index + 1;
      const inv = invoiceRows.find((r) => r.bucket === m);
      const exp = expenseRows.find((r) => r.bucket === m);

      return buildCashPoint(
        label,
        exp ? Number(exp.total) : 0,
        inv ? Number(inv.collections) : 0,
        inv ? Number(inv.outstanding) : 0
      );
    });
  }

  const totalCollections = Number(
    points.reduce((sum, p) => sum + p.collections, 0).toFixed(2)
  );
  const totalExpenses = Number(
    points.reduce((sum, p) => sum + p.expenses, 0).toFixed(2)
  );
  const outstandingReceivables = Number(
    points.reduce((sum, p) => sum + p.outstanding, 0).toFixed(2)
  );
  const netCashflow = Number((totalCollections - totalExpenses).toFixed(2));

  // sabse zyada collection wala point aur sabse zyada expense wala point dhoondo
  const bestCollectionPoint = points.reduce(
    (best, p) => (p.collections > best.collections ? p : best),
    points[0]
  );
  const peakExpensePoint = points.reduce(
    (peak, p) => (p.expenses > peak.expenses ? p : peak),
    points[0]
  );

  res.status(200).json({
    success: true,
    data: {
      period,
      points,
      total_collections: totalCollections,
      total_expenses: totalExpenses,
      net_cashflow: netCashflow,
      outstanding_receivables: outstandingReceivables,
      best_collection: {
        label: bestCollectionPoint.label,
        value: bestCollectionPoint.collections,
      },
      peak_expense: {
        label: peakExpensePoint.label,
        value: peakExpensePoint.expenses,
      },
    },
  });
});

// GET /api/reports/category-performance?period=weekly|monthly|quarterly|yearly
const getCategoryPerformanceReport = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
 
  const allowedPeriods = ["weekly", "monthly", "quarterly", "yearly"];
  const period = allowedPeriods.includes(req.query.period)
    ? req.query.period
    : "weekly";
 
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
 
  let query = reportsGetQueries.getCategoryPerformanceBase;
  const values = [owner_id];
 
  if (period === "weekly") {
    query += ` AND YEARWEEK(i.created_at, 1) = YEARWEEK(CURDATE(), 1) `;
  } else if (period === "monthly") {
    query += ` AND YEAR(i.created_at) = YEAR(CURDATE()) AND MONTH(i.created_at) = MONTH(CURDATE()) `;
  } else if (period === "quarterly") {
    const quarterStartMonth = Math.floor((currentMonth - 1) / 3) * 3 + 1;
    const quarterEndMonth = quarterStartMonth + 2;
 
    query += ` AND YEAR(i.created_at) = ? AND MONTH(i.created_at) BETWEEN ? AND ? `;
    values.push(currentYear, quarterStartMonth, quarterEndMonth);
  } else {
    // yearly
    query += ` AND YEAR(i.created_at) = ? `;
    values.push(currentYear);
  }
 
  query += ` GROUP BY p.product_category ORDER BY revenue DESC `;
 
  const [rows] = await db.query(query, values);
 
  const items = rows.map((row) => ({
    category: row.category,
    revenue: Number(Number(row.revenue).toFixed(2)),
    profit: Number(Number(row.profit).toFixed(2)),
    quantity: Number(row.quantity),
    orders: Number(row.orders),
  }));
 
  const topCategory = items.length > 0 ? items[0].category : null;
 
  res.status(200).json({
    success: true,
    data: {
      period,
      items,
      top_category: topCategory,
    },
  });
});
 
// GET /api/reports/customer-insights?period=weekly|monthly|quarterly|yearly
const getCustomerInsightsReport = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
 
  const allowedPeriods = ["weekly", "monthly", "quarterly", "yearly"];
  const period = allowedPeriods.includes(req.query.period)
    ? req.query.period
    : "weekly";
 
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
 
  let points = [];
  let totalsRow;
 
  if (period === "weekly") {
    const [bucketRows] = await db.query(
      reportsGetQueries.getCustomerStatsByWeekday,
      [owner_id, owner_id]
    );
    const [[totals]] = await db.query(
      reportsGetQueries.getCustomerTotalsWeekly,
      [owner_id, owner_id]
    );
    totalsRow = totals;
 
    const dayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
 
    points = dayLabels.map((label, index) => {
      const row = bucketRows.find((r) => r.bucket === index);
      return {
        label,
        new_customers: row ? Number(row.new_customers) : 0,
        repeat_customers: row ? Number(row.repeat_customers) : 0,
        repeat_revenue: row ? Number(Number(row.repeat_revenue).toFixed(2)) : 0,
      };
    });
  } else if (period === "monthly") {
    const [bucketRows] = await db.query(
      reportsGetQueries.getCustomerStatsByDayOfMonth,
      [owner_id, owner_id]
    );
    const [[totals]] = await db.query(
      reportsGetQueries.getCustomerTotalsMonthly,
      [owner_id, owner_id]
    );
    totalsRow = totals;
 
    const weekBuckets = [1, 2, 3, 4, 5].map(() => ({
      new_customers: 0,
      repeat_customers: 0,
      repeat_revenue: 0,
    }));
 
    bucketRows.forEach((row) => {
      const weekIdx = Math.min(Math.ceil(row.bucket / 7), 5) - 1;
      weekBuckets[weekIdx].new_customers += Number(row.new_customers);
      weekBuckets[weekIdx].repeat_customers += Number(row.repeat_customers);
      weekBuckets[weekIdx].repeat_revenue += Number(row.repeat_revenue);
    });
 
    points = weekBuckets.map((bucket, index) => ({
      label: `W${index + 1}`,
      new_customers: bucket.new_customers,
      repeat_customers: bucket.repeat_customers,
      repeat_revenue: Number(bucket.repeat_revenue.toFixed(2)),
    }));
  } else if (period === "quarterly") {
    const quarterStartMonth = Math.floor((currentMonth - 1) / 3) * 3 + 1;
    const quarterEndMonth = quarterStartMonth + 2;
 
    const [bucketRows] = await db.query(
      reportsGetQueries.getCustomerStatsByMonthRange,
      [owner_id, owner_id, currentYear, quarterStartMonth, quarterEndMonth]
    );
    const [[totals]] = await db.query(
      reportsGetQueries.getCustomerTotalsByMonthRange,
      [owner_id, owner_id, currentYear, quarterStartMonth, quarterEndMonth]
    );
    totalsRow = totals;
 
    const monthLabels = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];
 
    points = [];
    for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
      const row = bucketRows.find((r) => r.bucket === m);
      points.push({
        label: monthLabels[m - 1],
        new_customers: row ? Number(row.new_customers) : 0,
        repeat_customers: row ? Number(row.repeat_customers) : 0,
        repeat_revenue: row ? Number(Number(row.repeat_revenue).toFixed(2)) : 0,
      });
    }
  } else {
    // yearly
    const [bucketRows] = await db.query(
      reportsGetQueries.getCustomerStatsByMonthRange,
      [owner_id, owner_id, currentYear, 1, 12]
    );
    const [[totals]] = await db.query(
      reportsGetQueries.getCustomerTotalsByMonthRange,
      [owner_id, owner_id, currentYear, 1, 12]
    );
    totalsRow = totals;
 
    const monthLabels = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];
 
    points = monthLabels.map((label, index) => {
      const m = index + 1;
      const row = bucketRows.find((r) => r.bucket === m);
      return {
        label,
        new_customers: row ? Number(row.new_customers) : 0,
        repeat_customers: row ? Number(row.repeat_customers) : 0,
        repeat_revenue: row ? Number(Number(row.repeat_revenue).toFixed(2)) : 0,
      };
    });
  }
 
  const totalNewCustomers = Number(totalsRow.total_new_customers) || 0;
  const totalRepeatCustomers = Number(totalsRow.total_repeat_customers) || 0;
  const repeatRevenue = Number((Number(totalsRow.repeat_revenue) || 0).toFixed(2));
 
  const denominator = totalNewCustomers + totalRepeatCustomers;
  const repeatRate =
    denominator === 0
      ? 0
      : Number(((totalRepeatCustomers / denominator) * 100).toFixed(2));
 
  res.status(200).json({
    success: true,
    data: {
      period,
      points,
      total_new_customers: totalNewCustomers,
      total_repeat_customers: totalRepeatCustomers,
      repeat_revenue: repeatRevenue,
      repeat_rate: repeatRate,
    },
  });
});
 
// GET /api/reports/payment-insights?period=weekly|monthly|quarterly|yearly
const getPaymentInsightsReport = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;
 
  const allowedPeriods = ["weekly", "monthly", "quarterly", "yearly"];
  const period = allowedPeriods.includes(req.query.period)
    ? req.query.period
    : "weekly";
 
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
 
  let row;
 
  if (period === "weekly") {
    const [[result]] = await db.query(
      reportsGetQueries.getPaymentInsightsWeekly,
      [owner_id]
    );
    row = result;
  } else if (period === "monthly") {
    const [[result]] = await db.query(
      reportsGetQueries.getPaymentInsightsMonthly,
      [owner_id]
    );
    row = result;
  } else if (period === "quarterly") {
    const quarterStartMonth = Math.floor((currentMonth - 1) / 3) * 3 + 1;
    const quarterEndMonth = quarterStartMonth + 2;
 
    const [[result]] = await db.query(
      reportsGetQueries.getPaymentInsightsByMonthRange,
      [owner_id, currentYear, quarterStartMonth, quarterEndMonth]
    );
    row = result;
  } else {
    // yearly
    const [[result]] = await db.query(
      reportsGetQueries.getPaymentInsightsByMonthRange,
      [owner_id, currentYear, 1, 12]
    );
    row = result;
  }
 
  const paidAmount = Number(row.paid_amount) || 0;
  const partialAmount = Number(row.partial_amount) || 0;
  const pendingAmount = Number(row.pending_amount) || 0;
  const overdueAmount = Number(row.overdue_amount) || 0;
 
  const totalBilled = paidAmount + partialAmount + pendingAmount + overdueAmount;
 
  const pct = (amount) =>
    totalBilled === 0 ? 0 : Number(((amount / totalBilled) * 100).toFixed(2));
 
  const statuses = [
    {
      status: "PAID",
      count: Number(row.paid_count) || 0,
      amount: Number(paidAmount.toFixed(2)),
      percentage: pct(paidAmount),
    },
    {
      status: "PARTIAL",
      count: Number(row.partial_count) || 0,
      amount: Number(partialAmount.toFixed(2)),
      percentage: pct(partialAmount),
    },
    {
      status: "PENDING",
      count: Number(row.pending_count) || 0,
      amount: Number(pendingAmount.toFixed(2)),
      percentage: pct(pendingAmount),
    },
    {
      status: "OVERDUE",
      count: Number(row.overdue_count) || 0,
      amount: Number(overdueAmount.toFixed(2)),
      percentage: pct(overdueAmount),
    },
  ];
 
  res.status(200).json({
    success: true,
    data: {
      period,
      statuses,
      collected_amount: Number((Number(row.collected_amount) || 0).toFixed(2)),
      outstanding_amount: Number((Number(row.outstanding_amount) || 0).toFixed(2)),
      overdue_amount: Number((Number(row.overdue_remaining) || 0).toFixed(2)),
    },
  });
});
 
module.exports = {
  getReportsOverview,
  getSalesProfitReport,
  getCashflowReport,
  getCategoryPerformanceReport,
  getCustomerInsightsReport,
  getPaymentInsightsReport,
};
 