"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Subscription = sequelize.define(
  "subscription",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: Sequelize.STRING, allowNull: false },
    day: { type: Sequelize.INTEGER, allowNull: false },
    price: { type: Sequelize.INTEGER, allowNull: false },
  },
  {
    paranoid: true,
  }
);

module.exports = Subscription;
