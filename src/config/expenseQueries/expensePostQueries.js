const expensePostQueries = {
  createExpense: `
    INSERT INTO expenses
    (
        owner_id,
        title,
        category,
        amount,
        payment_mode,
        expense_date,
        notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
};

module.exports = expensePostQueries;