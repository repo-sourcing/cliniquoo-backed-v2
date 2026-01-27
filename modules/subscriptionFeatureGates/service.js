const db = require('../../config/db');
const { Op } = require('sequelize');

const SubscriptionFeatureGate = db.models.SubscriptionFeatureGate;

exports.checkFeatureAccess = async (subscriptionTierId, featureKey) => {
  try {
    const feature = await SubscriptionFeatureGate.findOne({
      where: {
        subscriptionTierId,
        featureKey,
        isEnabled: true
      }
    });

    return {
      hasAccess: !!feature,
      feature: feature ? {
        id: feature.id,
        name: feature.featureName,
        description: feature.description,
        usageLimit: feature.usageLimit,
        usageUnit: feature.usageUnit
      } : null
    };
  } catch (error) {
    throw new Error(`Feature access check failed: ${error.message}`);
  }
};

exports.getAvailableFeatures = async (subscriptionTierId, category = null) => {
  try {
    const where = { subscriptionTierId, isEnabled: true };
    if (category) {
      where.category = category;
    }

    const features = await SubscriptionFeatureGate.findAll({
      where,
      order: [['category', 'ASC'], ['featureName', 'ASC']],
      attributes: ['id', 'featureName', 'featureKey', 'category', 'description', 'usageLimit', 'usageUnit', 'resetFrequency']
    });

    return {
      totalFeatures: features.length,
      features: features.map(f => ({
        id: f.id,
        name: f.featureName,
        key: f.featureKey,
        category: f.category,
        description: f.description,
        usageLimit: f.usageLimit,
        usageUnit: f.usageUnit
      }))
    };
  } catch (error) {
    throw new Error(`Failed to fetch available features: ${error.message}`);
  }
};

exports.getFeaturesByCategory = async (subscriptionTierId, category) => {
  try {
    const features = await SubscriptionFeatureGate.findAll({
      where: {
        subscriptionTierId,
        category,
        isEnabled: true
      },
      order: [['featureName', 'ASC']]
    });

    return features.map(f => ({
      id: f.id,
      name: f.featureName,
      key: f.featureKey,
      usageLimit: f.usageLimit
    }));
  } catch (error) {
    throw new Error(`Failed to fetch features by category: ${error.message}`);
  }
};

exports.enableFeature = async (subscriptionTierId, featureKey) => {
  try {
    const feature = await SubscriptionFeatureGate.findOne({
      where: {
        subscriptionTierId,
        featureKey
      }
    });

    if (!feature) {
      throw new Error('Feature not found for this subscription tier');
    }

    await feature.update({ isEnabled: true });
    return { success: true, message: 'Feature enabled' };
  } catch (error) {
    throw new Error(`Failed to enable feature: ${error.message}`);
  }
};

exports.disableFeature = async (subscriptionTierId, featureKey) => {
  try {
    const feature = await SubscriptionFeatureGate.findOne({
      where: {
        subscriptionTierId,
        featureKey
      }
    });

    if (!feature) {
      throw new Error('Feature not found for this subscription tier');
    }

    await feature.update({ isEnabled: false });
    return { success: true, message: 'Feature disabled' };
  } catch (error) {
    throw new Error(`Failed to disable feature: ${error.message}`);
  }
};

exports.createFeature = async (subscriptionTierId, featureData) => {
  try {
    const { featureName, featureKey, description, category, usageLimit, usageUnit, resetFrequency } = featureData;

    // Check for duplicate
    const existing = await SubscriptionFeatureGate.findOne({
      where: {
        subscriptionTierId,
        featureKey
      }
    });

    if (existing) {
      throw new Error('This feature already exists for this subscription tier');
    }

    const feature = await SubscriptionFeatureGate.create({
      subscriptionTierId,
      featureName,
      featureKey,
      description,
      category: category || 'admin',
      usageLimit,
      usageUnit,
      resetFrequency: resetFrequency || 'perpetual',
      isEnabled: true
    });

    return feature;
  } catch (error) {
    throw new Error(`Failed to create feature: ${error.message}`);
  }
};

exports.updateFeature = async (featureId, subscriptionTierId, updates) => {
  try {
    const feature = await SubscriptionFeatureGate.findOne({
      where: { id: featureId, subscriptionTierId }
    });

    if (!feature) {
      throw new Error('Feature not found');
    }

    const allowedUpdates = ['description', 'usageLimit', 'usageUnit', 'resetFrequency', 'isEnabled'];
    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    });

    await feature.update(filteredUpdates);
    return feature;
  } catch (error) {
    throw new Error(`Failed to update feature: ${error.message}`);
  }
};

exports.getFeatureStats = async (subscriptionTierId) => {
  try {
    const allFeatures = await SubscriptionFeatureGate.count({
      where: { subscriptionTierId }
    });

    const enabledFeatures = await SubscriptionFeatureGate.count({
      where: { subscriptionTierId, isEnabled: true }
    });

    const featuresByCategory = await SubscriptionFeatureGate.findAll({
      where: { subscriptionTierId, isEnabled: true },
      attributes: ['category', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['category'],
      raw: true
    });

    return {
      totalFeatures: allFeatures,
      enabledFeatures,
      disabledFeatures: allFeatures - enabledFeatures,
      byCategory: featuresByCategory.reduce((acc, item) => {
        acc[item.category] = parseInt(item.count);
        return acc;
      }, {})
    };
  } catch (error) {
    throw new Error(`Failed to fetch feature stats: ${error.message}`);
  }
};

exports.bulkEnableFeatures = async (subscriptionTierId, featureKeys) => {
  try {
    const result = await SubscriptionFeatureGate.update(
      { isEnabled: true },
      {
        where: {
          subscriptionTierId,
          featureKey: { [Op.in]: featureKeys }
        }
      }
    );

    return { enabled: result[0], message: `${result[0]} features enabled` };
  } catch (error) {
    throw new Error(`Failed to bulk enable features: ${error.message}`);
  }
};

exports.bulkDisableFeatures = async (subscriptionTierId, featureKeys) => {
  try {
    const result = await SubscriptionFeatureGate.update(
      { isEnabled: false },
      {
        where: {
          subscriptionTierId,
          featureKey: { [Op.in]: featureKeys }
        }
      }
    );

    return { disabled: result[0], message: `${result[0]} features disabled` };
  } catch (error) {
    throw new Error(`Failed to bulk disable features: ${error.message}`);
  }
};

exports.hasFeatureAccess = async (subscriptionTierId, featureKey) => {
  try {
    const feature = await SubscriptionFeatureGate.findOne({
      where: {
        subscriptionTierId,
        featureKey,
        isEnabled: true
      }
    });

    return !!feature;
  } catch (error) {
    return false;
  }
};
