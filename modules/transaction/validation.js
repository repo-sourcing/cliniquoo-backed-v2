const yup = require("yup");
exports.transactionValidation = async (req, res, next) => {
  try {
    const transactionSchema = yup.object().shape({
      type: yup.mixed().oneOf(["Cash", "Online"]),
      amount: yup.number().required("amount is required field"),
      patientId: yup.number().required("patientId is required"),
      clinicId: yup.number().required("clinicId is required"),
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
exports.updateTransactionValidation = async (req, res, next) => {
  try {
    const transactionSchema = yup.object().shape({
      type: yup.mixed().oneOf(["Cash", "Online"]),
      amount: yup.number(),
      patientId: yup.number(),
      clinicId: yup.number(),
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
