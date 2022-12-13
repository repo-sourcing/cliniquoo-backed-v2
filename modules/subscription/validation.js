const yup = require("yup");
exports.subscriptionValidation = async (req, res, next) => {
  try {
    const subscriptionSchema = yup.object().shape({
      day: yup.number().required("day is required field"),
      name: yup.string().required("name is required"),
      price: yup.number().required("price is required"),
    });
    await subscriptionSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateSubscriptionValidation = async (req, res, next) => {
  try {
    const subscriptionSchema = yup.object().shape({
      day: yup.number(),
      name: yup.string(),
      price: yup.number(),
    });
    await subscriptionSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
