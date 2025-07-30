const yup = require("yup");
exports.transactionValidation = async (req, res, next) => {
  try {
    const transactionSchema = yup.object().shape({
      cash: yup.number(),
      online: yup.number(),
      patientId: yup.number().required("patientId is required"),
      clinicId: yup.number().required("clinicId is required"),
    });
    await transactionSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error,
    });
  }
};
exports.updateTransactionValidation = async (req, res, next) => {
  try {
    const transactionSchema = yup.object().shape({
      cash: yup.number(),
      online: yup.number(),
      patientId: yup.number(),
      clinicId: yup.number(),
      createdAt: yup.date(),
    });
    await transactionSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
