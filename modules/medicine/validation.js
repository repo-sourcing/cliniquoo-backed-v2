const yup = require("yup");
exports.medicineValidation = async (req, res, next) => {
  try {
    const medicineSchema = yup.object().shape({
      name: yup.string().required("Name is required"),
      qty: yup.number(),
      //frequency is Object
      frequency: yup.object().shape({
        Morning: yup.number().min(0).required("Morning frequency is required"),
        AfterNoon: yup
          .number()
          .min(0)
          .required("AfterNoon frequency is required"),
        Night: yup.number().min(0).required("Night frequency is required"),
        BeforeMeal: yup
          .number()
          .min(0)
          .required("Before Meal frequency is required"),
        AfterMeal: yup
          .number()
          .min(0)
          .required("After Meal frequency is required"),
      }),
      days: yup.number(),
    });
    await medicineSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error,
    });
  }
};
exports.updateTransactionValidation = async (req, res, next) => {
  try {
    const medicineSchema = yup.object().shape({
      name: yup.string(),
      qty: yup.number(),
      frequency: yup.string(),
      days: yup.number(),
    });
    await medicineSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
