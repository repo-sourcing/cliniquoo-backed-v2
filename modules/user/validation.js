const yup = require("yup");
exports.userValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/;
    const userSchema = yup.object().shape({
      emailUid: yup.string().required("emailUid is required field"),
      mobileUid: yup.string().required(" mobileUid is required field"),
      name: yup.string().required("name is required field"),
      email: yup
        .string()
        .email("Please enter valid email")
        .required("Email is required"),
      mobile: yup
        .string()
        .matches(phoneRegExp, "mobile number should be valid 10 digits")
        .min(10, "mobile number should be valid 10 digits")
        .max(10, "mobile number should be valid 10 digits")
        .required("mobile number is required field"),
      profilePic: yup.string(),
      about: yup.string(),
      FcmToken: yup.string(),
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
      emailUid: yup.string(),
      mobileUid: yup.string(),
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
