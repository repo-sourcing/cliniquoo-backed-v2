const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionFeatureGate = sequelize.define(
    'SubscriptionFeatureGate',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      subscriptionTierId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
      },
      featureName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'unique_tier_feature'
      },
      featureKey: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'unique_tier_feature'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      category: {
        type: DataTypes.ENUM('analytics', 'prescription', 'patient', 'appointment', 'billing', 'messaging', 'admin'),
        allowNull: false,
        defaultValue: 'admin'
      },
      usageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      usageUnit: {
        type: DataTypes.ENUM('count', 'gb', 'requests', 'users'),
        allowNull: true
      },
      resetFrequency: {
        type: DataTypes.ENUM('daily', 'monthly', 'yearly', 'perpetual'),
        allowNull: false,
        defaultValue: 'perpetual'
      }
    },
    {
      tableName: 'subscriptionFeatureGates',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['subscriptionTierId'] },
        { fields: ['featureKey'] },
        { fields: ['category'] },
        { fields: ['isEnabled'] },
        { fields: ['subscriptionTierId', 'isEnabled'] }
      ]
    }
  );

  return SubscriptionFeatureGate;
};
