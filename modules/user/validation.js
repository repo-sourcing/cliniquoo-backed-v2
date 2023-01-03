const yup = require("yup");
exports.userValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
    const userSchema = yup.object().shape({
      name: yup.string().required("name is required field"),
      email: yup
        .string()
        .required("Email is required")
        .email("Please enter valid email"),
      mobile: yup
        .string()
        .matches(phoneRegExp, "mobile number should be valid 10 digits")
        .min(10, "mobile number should be valid 10 digits")
        .max(10, "mobile number should be valid 10 digits"),
      // .required("mobile number is required field"),
      profilePic: yup.string(),
      about: yup.string(),
      appVersion: yup.string(),
      device: yup.string(),
      FcmToken: yup.string(),
      dob: yup.date().required("dob is required field"),
      gender: yup
        .mixed()
        .oneOf(["M", "F", "O"])
        .required("gender is required field"),
    });
    await userSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateUserValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
    const userSchema = yup.object().shape({
      name: yup.string(),
      email: yup.string().email("Please enter valid email"),
      mobile: yup
        .string()
        .matches(phoneRegExp, "mobile number should be valid 10 digits")
        .min(10, "mobile number should be valid 10 digits")
        .max(10, "mobile number should be valid 10 digits"),
      profilePic: yup.string(),
      about: yup.string(),
      FcmToken: yup.string(),
      dob: yup.date(),
      gender: yup.mixed().oneOf(["M", "F", "O"]),
    });
    await userSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.sendOTPValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
    const userSchema = yup.object().shape({
      mobile: yup
        .string()
        .matches(phoneRegExp, "mobile number should be valid 10 digits")
        .min(10, "mobile number should be valid 10 digits")
        .max(10, "mobile number should be valid 10 digits")
        .required("mobile number is required field"),
    });
    await userSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.verifyOTPValidation = async (req, res, next) => {
  try {
    const userSchema = yup.object().shape({
      verify_id: yup.string().required("verify_id number is required field"),
      otp: yup
        .number()
        .min(1000, "OTP should be valid 4 digits")
        .max(9999, "OTP should be valid 4 digits"),
    });
    await userSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
