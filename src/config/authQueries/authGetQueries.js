const authGetQueries = {
  getProfile: `
    SELECT
      id,
      shop_name,
      owner_name,
      email,
      phone,
      whatsapp,
      address,
      logo
    FROM owners
    WHERE id = ?
  `,
};

module.exports = authGetQueries;