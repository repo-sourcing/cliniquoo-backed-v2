"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const Clinic = require("../clinic/model");
const Transaction = sequelize.define(
  "transaction",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: Sequelize.ENUM("Cash", "Online"),
      defaultValue: "Cash",
    },
    amount: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    notes: {
      type: Sequelize.TEXT,
    },
    processedToothNumber: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("processedToothNumber")
          ? JSON.parse(this.getDataValue("processedToothNumber"))
          : [];
      },
      set: function (val) {
        return this.setDataValue("processedToothNumber", JSON.stringify(val));
      },
    },
  },
  {
    paranoid: true,
  }
);

Patient.hasMany(Transaction, {
  foreignKey: {
    allowNull: false,
  },
});
Transaction.belongsTo(Patient);

Clinic.hasMany(Transaction, {
  foreignKey: {
    allowNull: false,
  },
});
Transaction.belongsTo(Clinic);

module.exports = Transaction;
