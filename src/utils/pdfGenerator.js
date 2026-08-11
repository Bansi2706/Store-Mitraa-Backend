const puppeteer = require("puppeteer");
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");

const generateInvoicePDF = async (data, filePath) => {
  // Template Path
  const templatePath = path.join(
    __dirname,
    "../templates/invoice.ejs"
  );

  // Render HTML
  const html = await ejs.renderFile(templatePath, data);

  // Launch Browser
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const page = await browser.newPage();

  // Load HTML
  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  // Create Folder
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true,
  });

  // Save PDF
  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return filePath;
};

module.exports = generateInvoicePDF;