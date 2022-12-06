const yup = require("yup");
exports.generalTreatmentValidation = async (req, res, next) => {
  try {
    const generalTreatmentSchema = yup.object().shape({
      name: yup.string().required("name is required field"),
    });
    await generalTreatmentSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateGeneralTreatmentValidation = async (req, res, next) => {
  try {
    const generalTreatmentSchema = yup.object().shape({
      name: yup.string(),
    });
    await generalTreatmentSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
