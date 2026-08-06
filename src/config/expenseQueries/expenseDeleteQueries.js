const expenseDeleteQueries = {
  deleteExpense: `
DELETE FROM expenses
WHERE id = ?
AND owner_id = ?
`,
};

module.exports = expenseDeleteQueries;