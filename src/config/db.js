const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: "+05:30",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Har naye connection pe MySQL session timezone ko IST set karo
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+05:30'");
});

module.exports = pool;