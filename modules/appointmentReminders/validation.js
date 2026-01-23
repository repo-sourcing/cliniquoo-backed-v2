const joi = require("joi");

exports.createReminderSchema = joi.object().keys({
  userId: joi
    .number()
    .integer()
    .required()
    .messages({ "number.base": "userId must be a number" }),
  clinicId: joi
    .number()
    .integer()
    .required()
    .messages({ "number.base": "clinicId must be a number" }),
  reminderType: joi
    .string()
    .valid("SMS", "Email", "WhatsApp")
    .required()
    .messages({
      "string.valid": "reminderType must be SMS, Email, or WhatsApp",
    }),
  timeBeforeAppointment: joi.number().integer().min(1).required().messages({
    "number.base": "timeBeforeAppointment must be a number",
    "number.min": "timeBeforeAppointment must be at least 1 minute",
  }),
  isEnabled: joi.boolean().optional().default(true),
});

exports.updateReminderSchema = joi.object().keys({
  reminderType: joi
    .string()
    .valid("SMS", "Email", "WhatsApp")
    .optional()
    .messages({
      "string.valid": "reminderType must be SMS, Email, or WhatsApp",
    }),
  timeBeforeAppointment: joi
    .number()
    .integer()
    .min(1)
    .optional()
    .messages({
      "number.min": "timeBeforeAppointment must be at least 1 minute",
    }),
  isEnabled: joi.boolean().optional(),
  isActive: joi.boolean().optional(),
});

exports.queryRemindersSchema = joi.object().keys({
  clinicId: joi
    .number()
    .integer()
    .required()
    .messages({ "number.base": "clinicId must be a number" }),
  isEnabled: joi.boolean().optional(),
  limit: joi.number().integer().min(1).default(10),
  offset: joi.number().integer().min(0).default(0),
});

exports.reminderIdSchema = joi.object().keys({
  reminderId: joi
    .number()
    .integer()
    .required()
    .messages({ "number.base": "reminderId must be a number" }),
});
