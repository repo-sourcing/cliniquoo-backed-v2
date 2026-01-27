const service = require('./service');
const { checkFeatureAccessSchema, getAvailableFeaturesSchema, getFeaturesByCategorySchema, enableFeatureSchema, disableFeatureSchema, createFeatureSchema, updateFeatureSchema, bulkFeaturesSchema, featureStatsSchema } = require('./validation');
const { formatFeatureResponse, formatFeatureList, isHighRiskChange } = require('./helpers');

exports.checkFeatureAccess = async (req, res) => {
  try {
    const { subscriptionTierId, featureKey } = req.query;

    const { error } = checkFeatureAccessSchema.validate({
      subscriptionTierId: parseInt(subscriptionTierId),
      featureKey
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const result = await service.checkFeatureAccess(parseInt(subscriptionTierId), featureKey);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAvailableFeatures = async (req, res) => {
  try {
    const { subscriptionTierId, category } = req.query;

    const { error } = getAvailableFeaturesSchema.validate({
      subscriptionTierId: parseInt(subscriptionTierId),
      category
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const result = await service.getAvailableFeatures(parseInt(subscriptionTierId), category);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getFeaturesByCategory = async (req, res) => {
  try {
    const { subscriptionTierId, category } = req.query;

    const { error } = getFeaturesByCategorySchema.validate({
      subscriptionTierId: parseInt(subscriptionTierId),
      category
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const features = await service.getFeaturesByCategory(parseInt(subscriptionTierId), category);

    return res.status(200).json({
      success: true,
      count: features.length,
      data: features
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.enableFeature = async (req, res) => {
  try {
    const { subscriptionTierId, featureKey } = req.body;

    const { error } = enableFeatureSchema.validate({
      subscriptionTierId,
      featureKey
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const result = await service.enableFeature(subscriptionTierId, featureKey);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.disableFeature = async (req, res) => {
  try {
    const { subscriptionTierId, featureKey } = req.body;

    const { error } = disableFeatureSchema.validate({
      subscriptionTierId,
      featureKey
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const result = await service.disableFeature(subscriptionTierId, featureKey);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.createFeature = async (req, res) => {
  try {
    const body = req.body;

    const { error } = createFeatureSchema.validate(body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const feature = await service.createFeature(body.subscriptionTierId, {
      featureName: body.featureName,
      featureKey: body.featureKey,
      description: body.description,
      category: body.category,
      usageLimit: body.usageLimit,
      usageUnit: body.usageUnit,
      resetFrequency: body.resetFrequency
    });

    return res.status(201).json({
      success: true,
      data: formatFeatureResponse(feature)
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateFeature = async (req, res) => {
  try {
    const { featureId } = req.params;
    const body = req.body;

    const { error } = updateFeatureSchema.validate({
      featureId: parseInt(featureId),
      ...body
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const feature = await service.updateFeature(parseInt(featureId), body.subscriptionTierId, body);

    return res.status(200).json({
      success: true,
      data: formatFeatureResponse(feature)
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getFeatureStats = async (req, res) => {
  try {
    const { subscriptionTierId } = req.query;

    const { error } = featureStatsSchema.validate({
      subscriptionTierId: parseInt(subscriptionTierId)
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const stats = await service.getFeatureStats(parseInt(subscriptionTierId));

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.bulkEnableFeatures = async (req, res) => {
  try {
    const { subscriptionTierId, featureKeys } = req.body;

    const { error } = bulkFeaturesSchema.validate({
      subscriptionTierId,
      featureKeys
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const result = await service.bulkEnableFeatures(subscriptionTierId, featureKeys);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.bulkDisableFeatures = async (req, res) => {
  try {
    const { subscriptionTierId, featureKeys } = req.body;

    const { error } = bulkFeaturesSchema.validate({
      subscriptionTierId,
      featureKeys
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const result = await service.bulkDisableFeatures(subscriptionTierId, featureKeys);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
