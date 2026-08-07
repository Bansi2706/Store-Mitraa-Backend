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
      logo,
      language,
      timezone,
      two_factor_enabled
    FROM owners
    WHERE id = ?
  `,
};

module.exports = authGetQueries;