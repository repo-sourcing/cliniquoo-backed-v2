const yup = require("yup");
exports.signUpValidation = async (req, res, next) => {
  try {
    const SignupSchema = yup.object().shape({
      name: yup.string().required("Name is required"),
      email: yup
        .string()
        .email("Please enter valid email")
        .required("Email is required"),

      password: yup.string().required("Password is required"),
    });
    await SignupSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.loginValidation = async (req, res, next) => {
  try {
    const LoginSchema = yup.object().shape({
      email: yup
        .string()
        .email("Please enter valid email")
        .required("Email is required"),

      password: yup.string().required("Password is required"),
    });
    await LoginSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
