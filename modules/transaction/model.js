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
    cash: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    online: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    amount: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    notes: {
      type: Sequelize.TEXT,
    },
    messageTime: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    },
    messageStatus: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: null,
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
    hooks: {
      beforeCreate: transaction => {
        transaction.amount =
          (transaction.cash || 0) + (transaction.online || 0);
      },
      beforeUpdate: transaction => {
        transaction.amount =
          (transaction.cash || 0) + (transaction.online || 0);
      },
    },
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
//Transaction.sync();
module.exports = Transaction;
