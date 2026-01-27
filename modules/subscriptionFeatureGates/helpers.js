exports.formatFeatureResponse = (feature) => {
  return {
    id: feature.id,
    name: feature.featureName,
    key: feature.featureKey,
    category: feature.category,
    description: feature.description,
    isEnabled: feature.isEnabled,
    usageLimit: feature.usageLimit,
    usageUnit: feature.usageUnit,
    resetFrequency: feature.resetFrequency,
    createdAt: feature.createdAt
  };
};

exports.formatFeatureList = (features) => {
  return features.map(f => exports.formatFeatureResponse(f));
};

exports.calculateAvailableCapacity = (usageLimit, currentUsage) => {
  if (!usageLimit) return null;
  return {
    total: usageLimit,
    used: currentUsage,
    available: Math.max(0, usageLimit - currentUsage),
    percentageUsed: ((currentUsage / usageLimit) * 100).toFixed(2)
  };
};

exports.groupFeaturesByCategory = (features) => {
  return features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {});
};

exports.isFeatureExpanded = (minimalTierFeatures, premiumTierFeatures) => {
  return premiumTierFeatures.length > minimalTierFeatures.length;
};

exports.calculateFeatureDifference = (tier1Features, tier2Features) => {
  const tier1Keys = new Set(tier1Features.map(f => f.featureKey));
  const tier2Keys = new Set(tier2Features.map(f => f.featureKey));

  return {
    onlyInTier1: tier1Features.filter(f => !tier2Keys.has(f.featureKey)),
    onlyInTier2: tier2Features.filter(f => !tier1Keys.has(f.featureKey)),
    common: tier1Features.filter(f => tier2Keys.has(f.featureKey))
  };
};

exports.validateFeatureKey = (key) => {
  const validFormat = /^[a-z][a-z0-9_]*$/.test(key);
  return {
    valid: validFormat,
    error: validFormat ? null : 'Feature key must start with lowercase letter and contain only lowercase, numbers, underscores'
  };
};

exports.isHighRiskChange = (action, feature) => {
  // Disabling billing features is high risk
  if (action === 'disable' && feature.category === 'billing') {
    return true;
  }
  // Reducing usage limits is moderate risk
  if (action === 'reduce_limit') {
    return true;
  }
  return false;
};

exports.generateFeatureRemovalNotice = (disabledFeatures) => {
  const categories = new Set(disabledFeatures.map(f => f.category));
  return {
    message: `${disabledFeatures.length} feature(s) have been disabled`,
    affectedCategories: Array.from(categories),
    affectedFeatures: disabledFeatures.map(f => f.featureName)
  };
};

exports.formatAccessDenialMessage = (featureKey, reason = 'not available') => {
  return {
    message: `Feature '${featureKey}' is ${reason} for your subscription tier`,
    featureKey,
    suggestion: 'Upgrade your subscription to access this feature'
  };
};

exports.createFeatureAuditLog = (subscriptionTierId, action, featureKey, changedBy) => {
  return {
    subscriptionTierId,
    action,
    featureKey,
    changedBy,
    timestamp: new Date().toISOString()
  };
};
