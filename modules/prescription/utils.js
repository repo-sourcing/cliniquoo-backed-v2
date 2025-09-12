const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");
const puppeteer = require("puppeteer");
const { uploadPdfToS3 } = require("../download/service");
//const { uploadToS3 } = require("../utils/s3Uploader");

const generatePrescriptionPDF = async data => {
  try {
    // Load Handlebars template
    const templatePath = path.join(
      __dirname,
      // "..",
      "..",
      "..",
      "template",
      "prescription.hbs"
    );
    const templateContent = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateContent);

    // Render HTML
    const html = template(data);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.executablePath,

      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Create PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1cm" },
    });

    await browser.close();

    // Upload to S3
    const fileName = `prescription_${Date.now()}.pdf`;

    const fileUrl = await uploadPdfToS3(pdfBuffer, fileName);

    return fileUrl; // return public S3 link
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw error;
  }
};

// Helper: Convert frequency object into readable schedule
const buildSchedule = freq => {
  const times = [];
  if (freq.Morning) times.push("Morning");
  if (freq.AfterNoon) times.push("Afternoon");
  if (freq.Night) times.push("Night");
  return times.join(", ") || "—";
};

// Helper: Add before/after meal info
const buildInstructions = freq => {
  if (freq.BeforeMeal) return "Before Meal";
  if (freq.AfterMeal) return "After Meal";
  return "";
};

module.exports = { generatePrescriptionPDF, buildSchedule, buildInstructions };
