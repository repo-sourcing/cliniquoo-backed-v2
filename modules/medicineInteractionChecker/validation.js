const Joi = require('joi');

exports.checkInteractionSchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  medicineId1: Joi.number().integer().positive().required(),
  medicineId2: Joi.number().integer().positive().required()
});

exports.checkMultipleSchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  medicineIds: Joi.array().items(Joi.number().integer().positive()).min(2).required()
});

exports.createInteractionSchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  medicineId1: Joi.number().integer().positive().required(),
  medicineId2: Joi.number().integer().positive().required(),
  severityLevel: Joi.string().valid('low', 'moderate', 'high', 'critical').required(),
  description: Joi.string().max(1000).required(),
  recommendation: Joi.string().max(1000).required(),
  conflictType: Joi.string().valid('drug-drug', 'drug-food', 'drug-condition', 'drug-lab')
});

exports.updateInteractionSchema = Joi.object({
  interactionId: Joi.number().integer().positive().required(),
  clinicId: Joi.number().integer().positive().required(),
  severityLevel: Joi.string().valid('low', 'moderate', 'high', 'critical'),
  description: Joi.string().max(1000),
  recommendation: Joi.string().max(1000),
  isActive: Joi.boolean()
});

exports.warningQuerySchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  severityLevel: Joi.string().valid('low', 'moderate', 'high', 'critical'),
  limit: Joi.number().integer().default(20).min(1).max(100),
  offset: Joi.number().integer().default(0).min(0)
});

exports.highRiskSchema = Joi.object({
  clinicId: Joi.number().integer().positive().required()
});

exports.deactivateInteractionSchema = Joi.object({
  interactionId: Joi.number().integer().positive().required(),
  clinicId: Joi.number().integer().positive().required()
});

exports.filterInteractionsSchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  minSeverity: Joi.string().valid('low', 'moderate', 'high', 'critical').required()
});
