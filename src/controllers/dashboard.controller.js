const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const dashboardGetQueries = require("../config/dashboardQueries/dashboardGetQueries");

// current - previous ke basis pe % change nikalta hai
const calcChange = (current, previous) => {
  current = Number(current);
  previous = Number(previous);

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const formatCurrency = (value) => {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const getDashboardOverview = asyncHandler(async (req, res) => {
  const owner_id = req.owner.id;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const lastMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
  const lastMonthYear = lastMonthDate.getFullYear();
  const lastMonth = lastMonthDate.getMonth() + 1;

  // ===== fetch owner name =====
  const [ownerRows] = await db.query(dashboardGetQueries.getOwnerName, [
    owner_id,
  ]);
  const ownerName = ownerRows[0]?.owner_name || "";
  const greetingName = ownerName.split(" ")[0] || "there";

  // ===== today / yesterday sales =====
  const [[todayRow]] = await db.query(dashboardGetQueries.getTodaySales, [
    owner_id,
  ]);
  const [[yesterdayRow]] = await db.query(
    dashboardGetQueries.getYesterdaySales,
    [owner_id]
  );

  const todaySales = Number(todayRow.total);
  const todayChange = calcChange(todaySales, Number(yesterdayRow.total));

  // ===== this week / last week sales =====
  const [[thisWeekRow]] = await db.query(
    dashboardGetQueries.getThisWeekSales,
    [owner_id]
  );
  const [[lastWeekRow]] = await db.query(
    dashboardGetQueries.getLastWeekSales,
    [owner_id]
  );

  const weeklySales = Number(thisWeekRow.total);
  const weeklyChange = calcChange(weeklySales, Number(lastWeekRow.total));

  // ===== revenue / profit (all-time totals) + month-over-month change =====
  const [[allTimeRow]] = await db.query(
    dashboardGetQueries.getAllTimeRevenueProfit,
    [owner_id]
  );
  const [[thisMonthRow]] = await db.query(
    dashboardGetQueries.getMonthRevenueProfit,
    [owner_id, currentYear, currentMonth]
  );
  const [[lastMonthRow]] = await db.query(
    dashboardGetQueries.getMonthRevenueProfit,
    [owner_id, lastMonthYear, lastMonth]
  );

  const revenue = Number(allTimeRow.revenue);
  const profit = Number(allTimeRow.profit);

  const revenueChange = calcChange(
    Number(thisMonthRow.revenue),
    Number(lastMonthRow.revenue)
  );
  const profitChange = calcChange(
    Number(thisMonthRow.profit),
    Number(lastMonthRow.profit)
  );

  // ===== low stock count =====
  const [[lowStockCountRow]] = await db.query(
    dashboardGetQueries.getLowStockCount,
    [owner_id]
  );
  const lowStockCount = Number(lowStockCountRow.count);

  // ===== stats array =====
  const stats = [
    {
      title: "TODAY SALES",
      value: formatCurrency(todaySales),
      change: `${todayChange >= 0 ? "+" : ""}${todayChange}%`,
      positive: todayChange >= 0,
      highlight: false,
      warning_label: null,
    },
    {
      title: "WEEKLY SALES",
      value: formatCurrency(weeklySales),
      change: `${weeklyChange >= 0 ? "+" : ""}${weeklyChange}%`,
      positive: weeklyChange >= 0,
      highlight: false,
      warning_label: null,
    },
    {
      title: "REVENUE",
      value: formatCurrency(revenue),
      change: `${revenueChange >= 0 ? "+" : ""}${revenueChange}%`,
      positive: revenueChange >= 0,
      highlight: false,
      warning_label: null,
    },
    {
      title: "PROFIT",
      value: formatCurrency(profit),
      change: `${profitChange >= 0 ? "+" : ""}${profitChange}%`,
      positive: profitChange >= 0,
      highlight: false,
      warning_label: null,
    },
    {
      title: "LOW STOCK",
      value: `${lowStockCount} Items`,
      change: "Requires reorder",
      positive: false,
      highlight: lowStockCount > 0,
      warning_label: lowStockCount > 0 ? "WARNING" : null,
    },
  ];

  // performance label = "is week ka sales, last week ka kitna % hai" (ratio%, change% nahi)
  // e.g. agar change +680.2% hai, toh yahan 780.2% aayega (100 + change%)
  const performanceRatio = Number((100 + weeklyChange).toFixed(1));
  const performance_label = `Your store is performing at ${performanceRatio}% this week.`;

  // ===== sales trend (last 7 days, zero-filled) =====
  const [trendRows] = await db.query(
    dashboardGetQueries.getSalesTrendLast7Days,
    [owner_id]
  );

  const sales_trends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const label = d
      .toLocaleString("en-US", { weekday: "short" })
      .toUpperCase();

    const found = trendRows.find((row) => row.sale_date === dateStr);

    sales_trends.push({
      label,
      value: found ? Number(found.total) : 0,
    });
  }

  // ===== revenue vs profit (quarter-wise, current year + YTD) =====
  const [quarterRows] = await db.query(
    dashboardGetQueries.getRevenueProfitByQuarter,
    [owner_id]
  );

  const revenue_profit = [1, 2, 3, 4].map((q) => {
    const found = quarterRows.find((row) => row.quarter === q);
    return {
      label: `Q${q}`,
      revenue: found ? Number(found.revenue) : 0,
      profit: found ? Number(found.profit) : 0,
    };
  });

  const ytdRevenue = revenue_profit.reduce((sum, q) => sum + q.revenue, 0);
  const ytdProfit = revenue_profit.reduce((sum, q) => sum + q.profit, 0);

  revenue_profit.push({
    label: "YTD",
    revenue: ytdRevenue,
    profit: ytdProfit,
  });

  // ===== recent bills =====
  const [recentBillsRows] = await db.query(dashboardGetQueries.getRecentBills, [
    owner_id,
  ]);

  const recent_bills = recentBillsRows.map((row) => ({
    id: row.invoice_number,
    date: new Date(row.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    amount: formatCurrency(row.total_amount),
    status: row.payment_status.toUpperCase(),
  }));

  // ===== low stock products =====
  const [lowStockProductRows] = await db.query(
    dashboardGetQueries.getLowStockProducts,
    [owner_id]
  );

  const low_stock_products = lowStockProductRows.map((row) => ({
    id: String(row.id),
    name: row.name,
    sku: row.sku,
    left: row.left,
    image: row.image ? `/uploads/products/${row.image}` : null,
  }));

  res.status(200).json({
    success: true,
    data: {
      greeting_name: greetingName,
      performance_label,
      stats,
      sales_trends,
      revenue_profit,
      recent_bills,
      low_stock_products,
    },
  });
});

module.exports = {
  getDashboardOverview,
};