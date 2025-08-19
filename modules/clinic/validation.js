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
      typeof r === "string"
        ? toObj(r)
        : {
            start: String(r.start || r.starts || "").trim(),
            end: String(r.end || "").trim(),
          }
    );
  } else if (typeof input === "string") {
    arr = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toObj);
  } else return [];

  // Keep original values; basic validation only
  const valid = arr.filter((r) => {
    const s = r.start || "";
    const e = r.end || "";
    if (!timeHHmm.test(s) || !timeHHmm.test(e)) return false;
    if (s === e) return false; // zero-length not allowed
    return true;
  });
  return valid;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m; // 0..1439
}

function expandToSegments(range) {
  // Returns 1 or 2 segments on [0,1440): [startMin,endMin)
  const s = toMinutes(range.start);
  const e = toMinutes(range.end);
  if (s < e) return [[s, e]]; // same-day
  // overnight: start -> 1440 and 0 -> end
  return [
    [s, 1440],
    [0, e],
  ];
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
      if (parsed.length === 0 || parsed.length > 6) return false;

      // Check overlaps using expanded segments, preserving original values (including 00:00)
      const segments = [];
      for (const r of parsed) segments.push(...expandToSegments(r));
      segments.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < segments.length; i++) {
        const [prevStart, prevEnd] = segments[i - 1];
        const [curStart, curEnd] = segments[i];
        if (prevEnd > curStart) return false; // overlap
      }

      return true;
    }
  );

exports.clinicDataValidation = async (req, res, next) => {
  try {
    const phoneRegExp =
      /^(\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*?([0-9]{3,4})[ \\-]*([0-9]{3,4})$/;
    const clinicDataSchema = yup.object().shape({
      name: yup.string().required("Name is required"),
      mobile: yup
        .string()
        .required("mobile number is required")
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
      /^(\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*?([0-9]{3,4})[ \\-]*([0-9]{3,4})$/;
    const clinicDataSchema = yup.object().shape({
      name: yup.string("please give valid name"),
      mobile: yup
        .string()
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
