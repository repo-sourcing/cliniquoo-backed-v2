const yup = require("yup");

const timeHHmm = /^([01]\d|2[0-3]):[0-5]\d$/; // 24h HH:mm

function parseTimeRanges(input) {
  if (!input) return [];
  const toObj = (s) => {
    const [start, end] = String(s)
      .split("-")
      .map((x) => (x || "").trim());
    return { start, end };
  };
  let arr = [];
  if (Array.isArray(input)) {
    arr = input.map((r) =>
      typeof r === "string" ? toObj(r) : { start: r.start, end: r.end }
    );
  } else if (typeof input === "string") {
    arr = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toObj);
  } else return [];

  const valid = arr.filter(
    (r) =>
      timeHHmm.test(r.start || "") &&
      timeHHmm.test(r.end || "") &&
      r.start < r.end
  );
  return valid;
}

function rangesOverlap(a, b) {
  // a and b: {start,end} with start<end strings in HH:mm
  return a.start < b.end && b.start < a.end;
}

const timeRangesFlexibleSchema = yup
  .mixed()
  .test(
    "valid-time-ranges",
    "timeRanges must be array or comma separated 'HH:mm-HH:mm' values",
    function (value) {
      if (value == null) return true; // handled by when()
      const parsed = parseTimeRanges(value);
      if (!Array.isArray(parsed)) return false;
      // non-empty and <= 6
      if (parsed.length === 0 || parsed.length > 6) return false;
      // no overlaps
      for (let i = 0; i < parsed.length; i++) {
        for (let j = i + 1; j < parsed.length; j++) {
          if (rangesOverlap(parsed[i], parsed[j])) return false;
        }
      }
      return true;
    }
  );

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
      scheduleByTime: yup.boolean().default(false),
      timeRanges: yup.mixed().when("scheduleByTime", {
        is: true,
        then: timeRangesFlexibleSchema.required(
          "timeRanges is required when scheduleByTime is true"
        ),
        otherwise: yup.mixed().notRequired(),
      }),
    });
    await clinicDataSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors?.[0] || error.message,
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
      scheduleByTime: yup.boolean(),
      timeRanges: yup.mixed().when("scheduleByTime", {
        is: true,
        then: timeRangesFlexibleSchema,
        otherwise: yup.mixed().notRequired(),
      }),
    });
    await clinicDataSchema.validate(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.errors?.[0] || error.message,
    });
  }
};
