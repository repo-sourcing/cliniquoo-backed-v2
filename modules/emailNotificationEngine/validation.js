const Joi = require("joi");

exports.createTemplateSchema = Joi.object({
  eventType: Joi.string()
    .valid("appointment", "prescription", "billing", "patient", "prescription_reminder", "bill_reminder")
    .required()
    .messages({
      "string.base": "Event type must be a string",
      "any.only": "Event type must be one of: appointment, prescription, billing, patient, prescription_reminder, bill_reminder",
      "any.required": "Event type is required",
    }),
  templateKey: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      "string.base": "Template key must be a string",
      "string.min": "Template key must be at least 3 characters",
      "string.max": "Template key cannot exceed 100 characters",
      "any.required": "Template key is required",
    }),
  subject: Joi.string()
    .min(5)
    .max(255)
    .required()
    .messages({
      "string.base": "Subject must be a string",
      "string.min": "Subject must be at least 5 characters",
      "string.max": "Subject cannot exceed 255 characters",
      "any.required": "Subject is required",
    }),
  body: Joi.string()
    .min(10)
    .required()
    .messages({
      "string.base": "Body must be a string",
      "string.min": "Body must be at least 10 characters",
      "any.required": "Body is required",
    }),
  htmlBody: Joi.string().optional(),
  maxRetries: Joi.number().min(0).max(10).optional(),
  retryStrategy: Joi.string()
    .valid("none", "exponential", "linear")
    .optional(),
});

exports.updateTemplateSchema = Joi.object({
  subject: Joi.string().min(5).max(255).optional(),
  body: Joi.string().min(10).optional(),
  htmlBody: Joi.string().optional(),
  maxRetries: Joi.number().min(0).max(10).optional(),
  retryStrategy: Joi.string()
    .valid("none", "exponential", "linear")
    .optional(),
});

exports.queueEmailSchema = Joi.object({
  templateKey: Joi.string().min(3).max(100).required(),
  recipient: Joi.string().email().required(),
  recipientName: Joi.string().max(255).optional(),
  placeholderData: Joi.object().default({}),
  priority: Joi.string()
    .valid("low", "normal", "high", "urgent")
    .optional(),
});

exports.sendEmailNowSchema = Joi.object({
  templateKey: Joi.string().min(3).max(100).required(),
  recipient: Joi.string().email().required(),
  recipientName: Joi.string().max(255).optional(),
  placeholderData: Joi.object().required(),
});

exports.getTemplatesByEventTypeSchema = Joi.object({
  eventType: Joi.string()
    .valid("appointment", "prescription", "billing", "patient", "prescription_reminder", "bill_reminder")
    .required(),
});

exports.getEmailLogsSchema = Joi.object({
  recipient: Joi.string().email().optional(),
  status: Joi.string().valid("success", "failure", "bounce").optional(),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
  limit: Joi.number().min(1).max(100).optional(),
});

exports.getEmailStatsSchema = Joi.object({
  from: Joi.date().required(),
  to: Joi.date().required(),
});

exports.retryFailedSchema = Joi.object({});

exports.processQueueSchema = Joi.object({});
