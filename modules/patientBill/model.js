"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const Clinic = require("../clinic/model");
const Patient = require("../patient/model");

const PatientBill = sequelize.define(
  "patientBill",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    invoiceNumber: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    billData: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("billData")
          ? JSON.parse(this.getDataValue("billData"))
          : {};
      },
      set: function (val) {
        return this.setDataValue("billData", JSON.stringify(val));
      },
    },
  },
  {
    paranoid: true,
  }
);
Clinic.hasMany(PatientBill, {
  foreignKey: {
    allowNull: false,
  },
});
PatientBill.belongsTo(Clinic);
Patient.hasMany(PatientBill, {
  foreignKey: {
    allowNull: false,
  },
});
PatientBill.belongsTo(Patient);

module.exports = PatientBill;
