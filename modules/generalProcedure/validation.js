const yup = require("yup");
exports.generalProcedureValidation = async (req, res, next) => {
  try {
    const generalProcedureSchema = yup.object().shape({
      name: yup.string().required("name is required field"),
    });
    await generalProcedureSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateGeneralProcedureValidation = async (req, res, next) => {
  try {
    const generalProcedureSchema = yup.object().shape({
      name: yup.string(),
    });
    await generalProcedureSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
