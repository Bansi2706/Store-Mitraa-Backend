const vendorDeleteQueries = {
  deleteVendor: `
    DELETE FROM vendors
    WHERE id = ? AND owner_id = ?
  `
};

module.exports = vendorDeleteQueries;