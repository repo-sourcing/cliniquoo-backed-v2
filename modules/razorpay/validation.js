const yup = require("yup");
exports.paymentValidation = async (req, res, next) => {
  try {
    const paymentSchema = yup.object().shape({
      subscriptionId: yup.number().required("subscriptionId is required field"),
    });
    await paymentSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
