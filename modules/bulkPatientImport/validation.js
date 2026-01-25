const Joi = require('joi');

exports.createImportSchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  file: Joi.object().required()
});

exports.importIdSchema = Joi.object({
  jobId: Joi.number().integer().positive().required(),
  clinicId: Joi.number().integer().positive().required()
});

exports.queryImportsSchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed'),
  limit: Joi.number().integer().default(10).min(1).max(100),
  offset: Joi.number().integer().default(0).min(0)
});

exports.patientRowSchema = Joi.object({
  name: Joi.string().required().max(255),
  email: Joi.string().email().allow(null),
  phone: Joi.string().max(20).allow(null),
  dateOfBirth: Joi.date().iso().allow(null),
  gender: Joi.string().valid('M', 'F', 'O').allow(null),
  address: Joi.string().max(500).allow(null),
  city: Joi.string().max(100).allow(null),
  state: Joi.string().max(100).allow(null),
  zipCode: Joi.string().max(20).allow(null),
  medicalHistory: Joi.string().max(1000).allow(null),
  allergies: Joi.string().max(500).allow(null),
  emergencyContact: Joi.string().max(255).allow(null),
  emergencyPhone: Joi.string().max(20).allow(null),
  insuranceProvider: Joi.string().max(255).allow(null),
  insurancePolicyNumber: Joi.string().max(100).allow(null),
  notes: Joi.string().max(1000).allow(null)
});
