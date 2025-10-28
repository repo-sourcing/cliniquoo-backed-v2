const yup = require("yup");

const timeHHmm = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeSlotSchema = yup
  .array()
  .of(yup.string().matches(timeHHmm, "time must be HH:mm"))
  .length(2, "timeSlot must have [start,end]")
  .nullable()
  .notRequired()
  .test("one-hour", "timeSlot must be exactly 1 hour and on the hour", val => {
    // Allow missing or null timeSlot
    if (val == null) return true;
    if (!Array.isArray(val)) return false;
    const [start, end] = val;
    if (!start || !end) return false;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (
      Number.isNaN(sh) ||
      Number.isNaN(sm) ||
      Number.isNaN(eh) ||
      Number.isNaN(em)
    )
      return false;
    if (sm !== 0 || em !== 0) return false;
    const duration = eh * 60 + em - (sh * 60 + sm);
    return duration === 60;
  });

exports.visitorValidation = async (req, res, next) => {
  try {
    const visitorSchema = yup.object().shape({
      date: yup.date(),
      patientId: yup.number().required("patientId is required"),
      clinicId: yup.number().required("clinicId is required"),
      isCanceled: yup.boolean(),
      timeSlot: timeSlotSchema.notRequired().nullable(),
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
      isCanceled: yup.boolean(),
      timeSlot: timeSlotSchema.notRequired().nullable(),
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
exports.rescheduleValidation = async (req, res, next) => {
  try {
    const visitorSchema = yup.object().shape({
      previousScheduleDate: yup
        .date()
        .required("previous schedule date is required field"),
      date: yup.date().required("schedule date is required field"),
      patientId: yup.number().required("patientId is required"),
      clinicId: yup.number().required("clinicId is required"),
      isCanceled: yup.boolean(),
      timeSlot: timeSlotSchema.notRequired().nullable(),
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

exports.scheduleValidation = async (req, res, next) => {
  try {
    const visitorSchema = yup.object().shape({
      date: yup.date().required("schedule date is required field"),
      patientId: yup.number().required("patientId is required"),
      clinicId: yup.number().required("clinicId is required"),
      timeSlot: timeSlotSchema.notRequired().nullable(),
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
