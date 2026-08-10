const authDeleteQueries = {
  deleteOldOTP: `
    DELETE FROM password_resets
    WHERE owner_id = ?
  `,

  deleteOTP: `
    DELETE FROM password_resets
    WHERE owner_id = ?
  `,

  deleteOwner: `
    DELETE FROM owners
    WHERE id = ?
  `,
};

module.exports = authDeleteQueries;