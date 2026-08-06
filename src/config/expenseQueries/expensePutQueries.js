const expensePutQueries = {
  updateExpense: `
UPDATE expenses
SET
    title = ?,
    category = ?,
    amount = ?,
    payment_mode = ?,
    expense_date = ?,
    notes = ?
WHERE id = ?
AND owner_id = ?
`,
};

module.exports = expensePutQueries;