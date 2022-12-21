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
    date: { type: Sequelize.DATEONLY, allowNull: false },
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
