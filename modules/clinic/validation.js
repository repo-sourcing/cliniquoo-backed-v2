const yup = require("yup");
exports.clinicDataValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
    const clinicDataSchema = yup.object().shape({
      name: yup.string().required("Name is required"),
      mobile: yup
        .string()
        .required("mobile number is required")
        .matches(phoneRegExp, "mobile number should be valid 10 digits")
        .min(10, "mobile number should be valid 10 digits")
        .max(10, "mobile number should be valid 10 digits"),
      location: yup.string().required("Location is required"),
      dayOff: yup.string(),
    });
    await clinicDataSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateClinicDataValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
    const clinicDataSchema = yup.object().shape({
      name: yup.string("please give valid name"),
      mobile: yup
        .string()
        .matches(phoneRegExp, "mobile number should be valid 10 digits")
        .min(10, "mobile number should be valid 10 digits")
        .max(10, "mobile number should be valid 10 digits"),
      location: yup.string(),
      dayOff: yup.string(),
    });
    await clinicDataSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
