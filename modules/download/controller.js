const downloadService = require("./service");

exports.downloadPatientsWithTreatments = async (req, res) => {
  try {
    const userId = req.requestor.id;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "User ID not found in request",
      });
    }

    const result = await downloadService.generatePatientsWithTreatmentsCSV(
      userId
    );

    res.status(200).json({
      status: "success",
      message: "CSV file generated successfully",
      data: {
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
        recordCount: result.recordCount,
      },
    });
  } catch (error) {
    console.error("Error downloading patients with treatments:", error);

    // Handle specific error types
    if (error.message === "No patients found for this user") {
      return res.status(404).json({
        status: "error",
        message: "No patients found for export",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to generate CSV file",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

exports.downloadPatientsWithTransactions = async (req, res) => {
  try {
    const userId = req.requestor.id;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "User ID not found in request",
      });
    }

    const result = await downloadService.generatePatientsWithTransactionsCSV(
      userId
    );

    res.status(200).json({
      status: "success",
      message: "CSV file generated successfully",
      data: {
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
        recordCount: result.recordCount,
      },
    });
  } catch (error) {
    console.error("Error downloading patients with transactions:", error);

    // Handle specific error types
    if (error.message === "No patients found for this user") {
      return res.status(404).json({
        status: "error",
        message: "No patients found for export",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to generate CSV file",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
