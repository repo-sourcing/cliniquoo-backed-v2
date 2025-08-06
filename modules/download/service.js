const { Parser } = require("json2csv");
const AWS = require("aws-sdk");
const Patient = require("../patient/model");
const Treatment = require("../treatment/model");
const Transaction = require("../transaction/model");
const Clinic = require("../clinic/model");
const { Op } = require("sequelize");

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-south-1",
});

const uploadToS3 = async (csvData, fileName) => {
  const params = {
    Bucket: process.env.Bucket,
    Key: `downloads/${fileName}`,
    Body: csvData,
    ContentType: "text/csv",
    ContentDisposition: `attachment; filename="${fileName}"`,
    ServerSideEncryption: "AES256",
  };

  try {
    const uploadResult = await s3.upload(params).promise();

    // Generate a pre-signed URL for download (valid for 1 hour)
    const downloadUrl = s3.getSignedUrl("getObject", {
      Bucket: process.env.Bucket,
      Key: `downloads/${fileName}`,
      Expires: 3600, // 1 hour
    });

    return {
      downloadUrl,
      s3Location: uploadResult.Location,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload CSV to S3");
  }
};

const generatePatientsWithTreatmentsCSV = async (userId) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Fetch patients with their treatments for the specific user
    const patients = await Patient.findAll({
      where: {
        userId: userId,
        isActive: true,
      },
      include: [
        {
          model: Treatment,
          required: false, // LEFT JOIN to include patients even without treatments
          include: [
            {
              model: Clinic,
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [
        ["name", "ASC"],
        [Treatment, "createdAt", "DESC"],
      ],
    });

    // Check if user has any patients
    if (!patients || patients.length === 0) {
      throw new Error("No patients found for this user");
    }

    // Transform data for CSV
    const csvData = [];

    patients.forEach((patient) => {
      if (patient.treatments && patient.treatments.length > 0) {
        // Patient has treatments - create one row per treatment
        patient.treatments.forEach((treatment) => {
          csvData.push({
            "Patient ID": patient.id,
            "Patient Name": patient.name,
            "Patient Mobile": patient.mobile,
            "Patient Gender": patient.gender,
            "Patient Age": patient.age,
            "Patient Location": patient.location || "",
            "Last Visited Date": patient.lastVisitedDate || "",
            "Discount Amount": patient.discountAmount || 0,
            "Treatment ID": treatment.id,
            "Treatment Name": treatment.name,
            "Treatment Amount": treatment.amount,
            "Clinic Name": treatment.clinic ? treatment.clinic.name : "",
            "Treatment Created Date": treatment.createdAt
              ? new Date(treatment.createdAt).toLocaleDateString()
              : "",
          });
        });
      } else {
        // Patient has no treatments - create one row with patient data only
        csvData.push({
          "Patient ID": patient.id,
          "Patient Name": patient.name,
          "Patient Mobile": patient.mobile,
          "Patient Gender": patient.gender,
          "Patient Age": patient.age,
          "Patient Location": patient.location || "",

          "Last Visited Date": patient.lastVisitedDate || "",
          "Discount Amount": patient.discountAmount || 0,
          "Treatment ID": "",
          "Treatment Name": "",
          "Treatment Amount": "",

          "Clinic Name": "",
          "Treatment Created Date": "",
        });
      }
    });

    // Define CSV fields
    const fields = [
      "Patient ID",
      "Patient Name",
      "Patient Mobile",
      "Patient Gender",
      "Patient Age",
      "Patient Location",

      "Last Visited Date",
      "Discount Amount",
      "Treatment ID",
      "Treatment Name",
      "Treatment Amount",
      "Tooth Numbers",
      "Treatment Status",
      "Clinic Name",
      "Treatment Created Date",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `patients-with-treatments-${userId}-${timestamp}.csv`;

    // Upload to S3
    const uploadResult = await uploadToS3(csv, fileName);

    return {
      downloadUrl: uploadResult.downloadUrl,
      fileName: fileName,
      recordCount: csvData.length,
    };
  } catch (error) {
    console.error("Error generating patients with treatments CSV:", error);
    throw error;
  }
};

const generatePatientsWithTransactionsCSV = async (userId) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Fetch patients with their transactions for the specific user
    const patients = await Patient.findAll({
      where: {
        userId: userId,
        isActive: true,
      },
      include: [
        {
          model: Transaction,
          required: false, // LEFT JOIN to include patients even without transactions
          include: [
            {
              model: Clinic,
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [
        ["name", "ASC"],
        [Transaction, "createdAt", "DESC"],
      ],
    });

    // Check if user has any patients
    if (!patients || patients.length === 0) {
      throw new Error("No patients found for this user");
    }

    // Transform data for CSV
    const csvData = [];

    patients.forEach((patient) => {
      if (patient.transactions && patient.transactions.length > 0) {
        // Patient has transactions - create one row per transaction
        patient.transactions.forEach((transaction) => {
          csvData.push({
            "Patient ID": patient.id,
            "Patient Name": patient.name,
            "Patient Mobile": patient.mobile,
            "Patient Gender": patient.gender,
            "Patient Age": patient.age,
            "Patient Location": patient.location || "",

            "Last Visited Date": patient.lastVisitedDate || "",
            "Discount Amount": patient.discountAmount || 0,
            "Transaction ID": transaction.id,
            "Cash Amount": transaction.cash || 0,
            "Online Amount": transaction.online || 0,
            "Total Amount": transaction.amount || 0,
            Notes: transaction.notes || "",

            "Clinic Name": transaction.clinic ? transaction.clinic.name : "",
            "Transaction Date": transaction.createdAt
              ? new Date(transaction.createdAt).toLocaleDateString()
              : "",
          });
        });
      } else {
        // Patient has no transactions - create one row with patient data only
        csvData.push({
          "Patient ID": patient.id,
          "Patient Name": patient.name,
          "Patient Mobile": patient.mobile,
          "Patient Gender": patient.gender,
          "Patient Age": patient.age,
          "Patient Location": patient.location || "",

          "Last Visited Date": patient.lastVisitedDate || "",
          "Discount Amount": patient.discountAmount || 0,
          "Transaction ID": "",
          "Cash Amount": "",
          "Online Amount": "",
          "Total Amount": "",
          Notes: "",
          "Clinic Name": "",
          "Transaction Date": "",
        });
      }
    });

    // Define CSV fields
    const fields = [
      "Patient ID",
      "Patient Name",
      "Patient Mobile",
      "Patient Gender",
      "Patient Age",
      "Patient Location",

      "Last Visited Date",
      "Discount Amount",
      "Transaction ID",
      "Cash Amount",
      "Online Amount",
      "Total Amount",
      "Notes",
      "Clinic Name",
      "Transaction Date",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `patients-with-transactions-${userId}-${timestamp}.csv`;

    // Upload to S3
    const uploadResult = await uploadToS3(csv, fileName);

    return {
      downloadUrl: uploadResult.downloadUrl,
      fileName: fileName,
      recordCount: csvData.length,
    };
  } catch (error) {
    console.error("Error generating patients with transactions CSV:", error);
    throw error;
  }
};

module.exports = {
  generatePatientsWithTreatmentsCSV,
  generatePatientsWithTransactionsCSV,
};
