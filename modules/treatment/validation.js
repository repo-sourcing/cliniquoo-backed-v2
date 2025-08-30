const yup = require("yup");
exports.treatmentValidation = async (req, res, next) => {
  try {
    const treatmentSchema = yup.object().shape({
      name: yup.string().required("name is required field"),

      amount: yup.number().required("amount is required field"),
      treatmentPlanId: yup
        .number()
        .required("treatmentPlanId is required field"),
    });
    await treatmentSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateTreatmentValidation = async (req, res, next) => {
  try {
    const treatmentSchema = yup.object().shape({
      name: yup.string(),
      amount: yup.number(),
    });
    await treatmentSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
