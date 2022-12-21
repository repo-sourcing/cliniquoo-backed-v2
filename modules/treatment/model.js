"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const Clinic = require("../clinic/model");
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
    toothNumber: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("toothNumber")
          ? JSON.parse(this.getDataValue("toothNumber"))
          : [];
      },
      set: function (val) {
        return this.setDataValue("toothNumber", JSON.stringify(val.split(",")));
      },
    },
    status: {
      type: Sequelize.ENUM("OnGoing", "Done"),
      defaultValue: "OnGoing",
    },
  },
  {
    paranoid: true,
  }
);

Patient.hasMany(Treatment, {
  foreignKey: {
    allowNull: false,
  },
});
Treatment.belongsTo(Patient);

Clinic.hasMany(Treatment, {
  foreignKey: {
    allowNull: false,
  },
});
Treatment.belongsTo(Clinic);

module.exports = Treatment;
