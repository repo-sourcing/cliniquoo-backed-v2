const joi = require("joi");

const clinicIdSchema = joi.object({
  clinicId: joi.number().integer().positive().required(),
});

const dateRangeSchema = joi.object({
  from: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("from must be valid ISO date (YYYY-MM-DD)")),
  to: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("to must be valid ISO date (YYYY-MM-DD)")),
});

const summarySchema = joi.object({
  clinicId: joi.number().integer().positive().required(),
});

const dailySchema = joi.object({
  clinicId: joi.number().integer().positive().required(),
  from: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("from must be valid ISO date")),
  to: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("to must be valid ISO date")),
});

const monthlySchema = joi.object({
  clinicId: joi.number().integer().positive().required(),
  year: joi
    .number()
    .integer()
    .min(2000)
    .max(2100)
    .optional()
    .default(new Date().getFullYear()),
});

const breakdownSchema = joi.object({
  clinicId: joi.number().integer().positive().required(),
  from: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("from must be valid ISO date")),
  to: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("to must be valid ISO date")),
});

const outstandingSchema = joi.object({
  clinicId: joi.number().integer().positive().required(),
  from: joi
    .string()
    .isoDate()
    .optional()
    .default(
      new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
    ),
  to: joi
    .string()
    .isoDate()
    .optional()
    .default(new Date().toISOString().split("T")[0]),
});

const trendSchema = joi.object({
  clinicId: joi.number().integer().positive().required(),
  period1From: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("period1From must be valid ISO date")),
  period1To: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("period1To must be valid ISO date")),
  period2From: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("period2From must be valid ISO date")),
  period2To: joi
    .string()
    .isoDate()
    .required()
    .error(new Error("period2To must be valid ISO date")),
});

exports.validateSummary = (data) => summarySchema.validate(data);
exports.validateDaily = (data) => dailySchema.validate(data);
exports.validateMonthly = (data) => monthlySchema.validate(data);
exports.validateBreakdown = (data) => breakdownSchema.validate(data);
exports.validateOutstanding = (data) => outstandingSchema.validate(data);
exports.validateTrend = (data) => trendSchema.validate(data);
