const yup = require("yup");
exports.procedureValidation = async (req, res, next) => {
  try {
    const procedureSchema = yup.object().shape({
      name: yup.string().required("name is required"),
      treatmentId: yup.number().required("treatmentId is required"),
    });
    await procedureSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateProcedureValidation = async (req, res, next) => {
  try {
    const procedureSchema = yup.object().shape({
      name: yup.string(),
      treatmentId: yup.number(),
    });
    await procedureSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
