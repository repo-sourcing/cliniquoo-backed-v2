const Joi = require('joi');

exports.checkFeatureAccessSchema = Joi.object({
  subscriptionTierId: Joi.number().integer().positive().required(),
  featureKey: Joi.string().required()
});

exports.getAvailableFeaturesSchema = Joi.object({
  subscriptionTierId: Joi.number().integer().positive().required(),
  category: Joi.string().valid('analytics', 'prescription', 'patient', 'appointment', 'billing', 'messaging', 'admin')
});

exports.getFeaturesByCategorySchema = Joi.object({
  subscriptionTierId: Joi.number().integer().positive().required(),
  category: Joi.string().valid('analytics', 'prescription', 'patient', 'appointment', 'billing', 'messaging', 'admin').required()
});

exports.enableFeatureSchema = Joi.object({
  subscriptionTierId: Joi.number().integer().positive().required(),
  featureKey: Joi.string().required()
});

exports.disableFeatureSchema = Joi.object({
  subscriptionTierId: Joi.number().integer().positive().required(),
  featureKey: Joi.string().required()
});

exports.createFeatureSchema = Joi.object({
  subscriptionTierId: Joi.number().integer().positive().required(),
  featureName: Joi.string().required().max(255),
  featureKey: Joi.string().required().max(100),
  description: Joi.string().max(1000),
  category: Joi.string().valid('analytics', 'prescription', 'patient', 'appointment', 'billing', 'messaging', 'admin').required(),
  usageLimit: Joi.number().integer().positive(),
  usageUnit: Joi.string().valid('count', 'gb', 'requests', 'users'),
  resetFrequency: Joi.string().valid('daily', 'monthly', 'yearly', 'perpetual')
});

exports.updateFeatureSchema = Joi.object({
  featureId: Joi.number().integer().positive().required(),
  subscriptionTierId: Joi.number().integer().positive().required(),
  description: Joi.string().max(1000),
  usageLimit: Joi.number().integer().positive().allow(null),
  usageUnit: Joi.string().valid('count', 'gb', 'requests', 'users'),
  resetFrequency: Joi.string().valid('daily', 'monthly', 'yearly', 'perpetual'),
  isEnabled: Joi.boolean()
});

exports.bulkFeaturesSchema = Joi.object({
  subscriptionTierId: Joi.number().integer().positive().required(),
  featureKeys: Joi.array().items(Joi.string()).min(1).required()
});

exports.featureStatsSchema = Joi.object({
  subscriptionTierId: Joi.number().integer().positive().required()
});
