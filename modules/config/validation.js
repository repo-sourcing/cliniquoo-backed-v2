const yup = require("yup");
exports.configDataValidation = async (req, res, next) => {
  try {
    const configDataSchema = yup.object().shape({
      appInMaintenance: yup.boolean(),
      androidVersionCode: yup.string(),
      iosVersionCode: yup.string(),
      forceUpdate: yup.boolean(),
      softUpdate: yup.boolean(),
    });
    await configDataSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
