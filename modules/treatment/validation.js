const yup = require("yup");
exports.treatmentValidation = async (req, res, next) => {
  try {
    const treatmentSchema = yup.object().shape({
      name: yup.string().required("name is required field"),

      amount: yup.number().required("amount is required field"),
      treatmentPlanId: yup
        .number()
        .required("treatmentPlanId is required field"),
    });
    await treatmentSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateTreatmentValidation = async (req, res, next) => {
  try {
    const treatmentSchema = yup.object().shape({
      name: yup.string(),
      amount: yup.number(),
    });
    await treatmentSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};

exports.billValidation = async (req, res, next) => {
  try {
    const billValidation = yup.object().shape({
      clinicId: yup.number().required("clinicId is required field"),
      date: yup.string().required("date is required field"),
      subTotal: yup.number(),
      discount: yup.number(),
      treatmentJson: yup
        .array()
        .of(
          yup.object().shape({
            id: yup.number().required("id is required field"),
            treatment: yup.string().required("treatment is required field"),
            price: yup.number().required("price is required field"),
          })
        )
        .required("treatmentJson is required field"),
    });
    await billValidation.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
