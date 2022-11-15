const yup = require("yup");
exports.visitorValidation = async (req, res, next) => {
  try {
    const visitorSchema = yup.object().shape({
      date: yup.date(),
      patientId: yup.number().required("patientId is required"),
      clinicId: yup.number().required("clinicId is required"),
    });
    await visitorSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateVisitorValidation = async (req, res, next) => {
  try {
    const visitorSchema = yup.object().shape({
      date: yup.date(),
      patientId: yup.number(),
      clinicId: yup.number(),
    });
    await visitorSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};