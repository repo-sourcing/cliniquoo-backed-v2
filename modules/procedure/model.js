"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Treatment = require("../treatment/model");
const Procedure = sequelize.define(
  "procedure",
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
  },
  {
    paranoid: true,
  }
);

Treatment.hasMany(Procedure, {
  foreignKey: {
    allowNull: false,
  },
});
Procedure.belongsTo(Treatment);

module.exports = Procedure;
