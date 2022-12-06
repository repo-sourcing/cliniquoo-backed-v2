"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const MedicalHistory = sequelize.define("medicalHistory", {
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
  description: {
    type: Sequelize.STRING,
  },
});

Patient.hasMany(MedicalHistory, {
  foreignKey: {
    allowNull: false,
  },
});
MedicalHistory.belongsTo(Patient);

module.exports = MedicalHistory;
