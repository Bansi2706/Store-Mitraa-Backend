const authPostQueries = {
  checkEmail: `
    SELECT id
    FROM owners
    WHERE email = ?
  `,

  checkPhone: `
    SELECT id
    FROM owners
    WHERE phone = ?
  `,

  register: `
    INSERT INTO owners
    (
      shop_name,
      owner_name,
      email,
      phone,
      whatsapp,
      address,
      logo,
      password
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,

  login: `
    SELECT *
    FROM owners
    WHERE email = ?
  `,
};

module.exports = authPostQueries;