const yup = require("yup");
exports.notificationValidation = async (req, res, next) => {
  try {
    const notificationSchema = yup.object().shape({
      title: yup.string().required("title is required"),
      body: yup.string().required("body is required"),
      click_action: yup.string(),
      userId:yup.number().required("userId is required")
    });
    await notificationSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
exports.updateNotificationValidation = async (req, res, next) => {
    try {
      const notificationSchema = yup.object().shape({
        title: yup.string(),
        body: yup.string(),
        click_action: yup.string(),
        userId:yup.number()
      });
      await notificationSchema.validate(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        errors: error.errors[0],
      });
    }
  };
