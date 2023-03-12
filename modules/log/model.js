"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");

const LogModel = sequelize.define("log", {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  method: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  url: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  payload: {
    type: Sequelize.TEXT,
    allowNull: true,
    get: function () {
      return JSON.parse(this.getDataValue("payload"));
    },
    set: function (val) {
      return this.setDataValue("payload", JSON.stringify(val));
    },
  },
  statusCode: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  message: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  stack: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
});

module.exports = LogModel;
