const authPutQueries = {
  updateProfile: `
    UPDATE owners
    SET
      shop_name = ?,
      owner_name = ?,
      phone = ?,
      whatsapp = ?,
      address = ?,
      logo = ?,
      language = ?,
      timezone = ?
    WHERE id = ?
  `,

  updatePassword: `
    UPDATE owners
    SET password = ?
    WHERE id = ?
  `,

  resetPassword: `
UPDATE owners
SET password = ?
WHERE id = ?
`,
};

module.exports = authPutQueries;