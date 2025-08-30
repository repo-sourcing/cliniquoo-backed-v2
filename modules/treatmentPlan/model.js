"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const Clinic = require("../clinic/model");
const TreatmentPlan = sequelize.define(
  "treatmentPlan",
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
    discount: {
      type: Sequelize.FLOAT,
      defaultValue: 0,
    },
  },
  {
    paranoid: true,
  }
);

Patient.hasMany(TreatmentPlan, {
  foreignKey: {
    allowNull: false,
  },
});
TreatmentPlan.belongsTo(Patient);

Clinic.hasMany(TreatmentPlan, {
  foreignKey: {
    allowNull: false,
  },
});
TreatmentPlan.belongsTo(Clinic);
//TreatmentPlan.sync();

module.exports = TreatmentPlan;
