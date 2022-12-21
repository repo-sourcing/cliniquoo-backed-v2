"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const DailyActivity = sequelize.define(
  "dailyActivity",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
  },
  {
    paranoid: true,
    alter: true,
  }
);
User.hasMany(DailyActivity, {
  foreignKey: {
    allowNull: false,
  },
});
DailyActivity.belongsTo(User);

module.exports = DailyActivity;
