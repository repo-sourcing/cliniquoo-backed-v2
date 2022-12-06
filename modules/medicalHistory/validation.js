const yup = require("yup");
exports.medicalHistoryValidation = async (req, res, next) => {
  try {
    const medicalHistorySchema = yup.object().shape({
      title: yup.string().required("title is required field"),
      description: yup.string(),
      patientId: yup.number().required("patientId is required"),
    });
    await medicalHistorySchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateMedicalHistoryValidation = async (req, res, next) => {
  try {
    const medicalHistorySchema = yup.object().shape({
      title: yup.string(),
      description: yup.string(),
      patientId: yup.number(),
    });
    await medicalHistorySchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
