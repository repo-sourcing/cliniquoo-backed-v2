const yup = require("yup");
exports.subscriptionValidation = async (req, res, next) => {
  try {
    const subscriptionSchema = yup.object().shape({
      date: yup.date().required("date is required field"),
      userId: yup.number().required("user id is required"),
      subscriptionId: yup.number().required("subscription id  is required"),
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
      date: yup.date(),
      userId: yup.number(),
      subscriptionId: yup.number(),
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
