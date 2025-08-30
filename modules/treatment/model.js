"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const TreatmentPlan = require("../treatmentPlan/model");
const Treatment = sequelize.define(
  "treatment",
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
    amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
  },
  {
    paranoid: true,
  }
);

TreatmentPlan.hasMany(Treatment, {
  foreignKey: {
    allowNull: false,
  },
});
Treatment.belongsTo(TreatmentPlan);

module.exports = Treatment;
