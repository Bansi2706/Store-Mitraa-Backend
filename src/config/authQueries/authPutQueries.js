const authPutQueries = {
  updateProfile: `
    UPDATE owners
    SET
      shop_name = ?,
      owner_name = ?,
      phone = ?,
      whatsapp = ?,
      address = ?,
      logo = ?
    WHERE id = ?
  `,


};

module.exports = authPutQueries;