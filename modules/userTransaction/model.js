"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const Subscription = require("../subscription/model");
const UserTransaction = sequelize.define(
  "userTransaction",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    amount: { type: Sequelize.INTEGER, allowNull: false },
    status: { type: Sequelize.STRING, allowNull: false }, //userId,paymentId,status,subscriptionId, transactionId
  },
  {
    paranoid: true,
  }
);

User.hasMany(UserTransaction, {
  foreignKey: {
    allowNull: false,
  },
});
UserTransaction.belongsTo(User);

Subscription.hasMany(UserTransaction, {
  foreignKey: {
    allowNull: false,
  },
});
UserTransaction.belongsTo(Subscription);

module.exports = UserTransaction;
