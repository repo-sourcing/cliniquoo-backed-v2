"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");

const Config = sequelize.define("config", {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  appInMaintenance: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  androidVersionCode: {
    type: Sequelize.STRING,
    defaultValue: "1.0.0",
  },
  iosVersionCode: {
    type: Sequelize.STRING,
    defaultValue: "1.0.0",
  },
  forceUpdate: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  softUpdate: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Config;
