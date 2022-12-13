const yup = require("yup");
exports.userTransactionValidation = async (req, res, next) => {
  try {
    const transactionSchema = yup.object().shape({
      amount: yup.number().required("amount is required field"),
      userId: yup.number().required("user id is required"),
      subscriptionId: yup.number().required("subscription id  is required"),
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
exports.updateUserTransactionValidation = async (req, res, next) => {
  try {
    const transactionSchema = yup.object().shape({
      amount: yup.number(),
      userId: yup.number(),
      subscriptionId: yup.number(),
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
