const yup = require("yup");
exports.treatmentValidation = async (req, res, next) => {
  try {
    const treatmentSchema = yup.object().shape({
      name: yup.string().required("name is required field"),
      status: yup.mixed().oneOf(["OnGoing", "Done"]),
      amount: yup.number().required("amount is required field"),
      toothNumber: yup.number(),
      patientId: yup.number().required("patientId is required"),
      clinicId: yup.number().required("clinicId is required"),
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
      status: yup.mixed().oneOf(["OnGoing", "Done"]),
      amount: yup.number(),
      toothNumber: yup.number(),
      patientId: yup.number(),
      clinicId: yup.number(),
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
