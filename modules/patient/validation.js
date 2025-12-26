const yup = require("yup");
exports.patientValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
    const patientSchema = yup.object().shape({
      name: yup.string().required("name is required"),
      location: yup.string(),
      mobile: yup
        .string()
        .matches(phoneRegExp, "mobile number should be valid 10 digits")
        .min(10, "mobile number should be valid 10 digits")
        .max(10, "mobile number should be valid 10 digits")
        .required(),
      age: yup.number().required("age is required"),
      gender: yup.mixed().oneOf(["M", "F", "O"]).required("gender is required"),
      remainBill: yup.number(),
      lastVisitedDate: yup.date(),
      notes: yup.string(),
      files: yup.array().of(
        yup.object().shape({
          link: yup.string(),
          type: yup.string(),
          originalname: yup.string(),
        })
      ),
    });
    await patientSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updatePatientValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
    const patientSchema = yup.object().shape({
      name: yup.string(),
      location: yup.string(),
      mobile: yup
        .string()
        .matches(phoneRegExp, "mobile number should be valid 10 digits")
        .min(10, "mobile number should be valid 10 digits")
        .max(10, "mobile number should be valid 10 digits"),
      age: yup.number(),
      gender: yup.mixed().oneOf(["M", "F", "O"]),
      remainBill: yup.number(),
      lastVisitedDate: yup.date(),
      notes: yup.string(),

      isActive: yup.boolean(),
      files: yup.array().of(
        yup.object().shape({
          link: yup.string(),
          type: yup.string(),
          originalname: yup.string(),
        })
      ),
    });
    await patientSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.fileValidation = async (req, res, next) => {
  try {
    const patientSchema = yup.object().shape({
      patientId: yup.number().required("patientId is required"),
    })
    await patientSchema.validate(req.body);
    next();

  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
} 
