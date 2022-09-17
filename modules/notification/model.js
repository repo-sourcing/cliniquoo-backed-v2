"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const Notification = sequelize.define("notification", {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  body: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  click_action: {
    type: Sequelize.STRING,
  },
});

User.hasMany(Notification);
Notification.belongsTo(User);
module.exports = Notification;
