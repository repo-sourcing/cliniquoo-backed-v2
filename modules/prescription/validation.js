const yup = require("yup");
exports.prescriptionValidation = async (req, res, next) => {
  try {
    const prescriptionSchema = yup.object().shape({
      patientId: yup.number().required("Patient ID is required"),
      transactionId: yup.number().required("Transaction ID is required"),
      //this is array of object
      prescription: yup
        .array()
        .of(
          yup.object().shape({
            name: yup.string().required("Name is required"),
            frequency: yup.object().shape({
              Morning: yup
                .number()
                .min(0)
                .required("Morning frequency is required"),
              AfterNoon: yup
                .number()
                .min(0)
                .required("AfterNoon frequency is required"),
              Night: yup
                .number()
                .min(0)
                .required("Night frequency is required"),
              BeforeMeal: yup
                .number()
                .min(0)
                .required("Before Meal frequency is required"),
              AfterMeal: yup
                .number()
                .min(0)
                .required("After Meal frequency is required"),
            }),
            days: yup.number(),
            qty: yup.number(),
          })
        )
        .required(),
      notes: yup.string(),
    });
    await prescriptionSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error,
    });
  }
};
exports.updatePrescriptionValidation = async (req, res, next) => {
  try {
    const prescriptionSchema = yup.object().shape({
      prescription: yup.array().of(
        yup.object().shape({
          name: yup.string(),
          frequency: yup.object().shape({
            Morning: yup.number().min(0),
            AfterNoon: yup.number().min(0),
            Night: yup.number().min(0),
            BeforeMeal: yup.number().min(0),
            AfterMeal: yup.number().min(0),
          }),
          days: yup.number(),
          qty: yup.number(),
        })
      ),
      notes: yup.string(),
    });
    await prescriptionSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors[0],
    });
  }
};
