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

  checkForgotEmail: `
  SELECT
    id,
    email,
    owner_name
  FROM owners
  WHERE email = ?
`,

saveOTP: `
  INSERT INTO password_resets
  (
    owner_id,
    otp,
    expires_at
  )
  VALUES (?, ?, ?)
`,

verifyOTP: `
SELECT
    pr.id,
    pr.owner_id,
    pr.otp,
    pr.expires_at,
    o.email
FROM password_resets pr

INNER JOIN owners o
    ON o.id = pr.owner_id

WHERE
    o.email = ?
    AND pr.otp = ?
`,

verifyResetOTP: `
SELECT
    pr.owner_id,
    pr.otp,
    pr.expires_at
FROM password_resets pr

INNER JOIN owners o
    ON o.id = pr.owner_id

WHERE
    o.email = ?
    AND pr.otp = ?
`,

};

module.exports = authPostQueries;