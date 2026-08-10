const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"Store Mitraa" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;