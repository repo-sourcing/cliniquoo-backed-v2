"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const GeneralComplain = sequelize.define(
  "GeneralComplain",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    icon: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  }
);

module.exports = GeneralComplain;
