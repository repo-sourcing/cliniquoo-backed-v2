const yup = require("yup");

exports.analyticsValidation = async (req, res, next) => {
  try {
    const validationSchema = yup.object().shape({
      userQuery: yup.string().required("User query is required"),
      sessionId: yup.string().optional(),
    });
    await validationSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
