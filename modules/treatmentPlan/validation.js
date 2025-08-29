const yup = require("yup");
exports.treatmentValidation = async (req, res, next) => {
  try {
    const treatmentValidation = yup.object().shape({
      name: yup.string().required(),
      clinicId: yup.number().required(),
      patientId: yup.number().required(),
    });
    await treatmentValidation.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error,
    });
  }
};
exports.updateTreatmenteValidation = async (req, res, next) => {
  try {
    const treatmentValidation = yup.object().shape({
      name: yup.string(),
      discount: yup.number().min(0),
    });
    await treatmentValidation.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
