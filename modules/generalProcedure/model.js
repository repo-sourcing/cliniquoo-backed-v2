"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const GeneralProcedure = sequelize.define(
  "generalProcedure",
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

module.exports = GeneralProcedure;
