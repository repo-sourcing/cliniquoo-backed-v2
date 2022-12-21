"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Clinic = require("../clinic/model");
const Patient = require("../patient/model");
const Visitor = sequelize.define("visitor", {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  date: { type: Sequelize.DATEONLY, allowNull: false },
  isCanceled: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
});

Clinic.hasMany(Visitor);
Visitor.belongsTo(Clinic);

Patient.hasMany(Visitor);
Visitor.belongsTo(Patient);

module.exports = Visitor;
