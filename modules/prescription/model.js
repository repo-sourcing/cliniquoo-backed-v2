"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const Patient = require("../patient/model");
const Transaction = require("../transaction/model");
const Prescription = sequelize.define(
  "prescription",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    prescription: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("prescription")
          ? JSON.parse(this.getDataValue("prescription"))
          : {};
      },
      set: function (val) {
        return this.setDataValue("prescription", JSON.stringify(val));
      },
    },
    notes: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  }
);
User.hasMany(Prescription, {
  foreignKey: {
    allowNull: false,
  },
});
Prescription.belongsTo(User);
Patient.hasMany(Prescription, {
  foreignKey: {
    allowNull: false,
  },
});
Prescription.belongsTo(Patient);
Transaction.hasMany(Prescription, {
  foreignKey: {
    allowNull: false,
  },
});
Prescription.belongsTo(Transaction);
//Prescription.sync();

module.exports = Prescription;
