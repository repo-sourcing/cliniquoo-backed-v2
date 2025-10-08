"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const Subscription = require("../subscription/model");
const UserSubscription = sequelize.define(
  "userSubscription",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    expiryDate: { type: Sequelize.DATEONLY, allowNull: true },
    status: { type: Sequelize.STRING, allowNull: false }, //active, expire
    patientLimit: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 20,
    },
  },
  {
    paranoid: true,
  }
);

User.hasOne(UserSubscription, {
  foreignKey: {
    allowNull: false,
  },
});
UserSubscription.belongsTo(User);

Subscription.hasMany(UserSubscription, {
  foreignKey: {
    allowNull: false,
  },
});
UserSubscription.belongsTo(Subscription);

module.exports = UserSubscription;
