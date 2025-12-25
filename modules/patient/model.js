"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const Patient = sequelize.define(
  "patient",
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
    location: {
      type: Sequelize.STRING,
    },
    mobile: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    gender: {
      type: Sequelize.ENUM("M", "F", "O"),
      allowNull: false,
    },
    age: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    remainBill: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    lastVisitedDate: {
      type: Sequelize.DATEONLY,
    },
    // discountAmount: {
    //   type: Sequelize.INTEGER,
    //   defaultValue: 0,
    // },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    files: {
      type: Sequelize.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue("files");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue("files", JSON.stringify(value));
      },
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    paranoid: true,
  }
);

User.hasMany(Patient);
Patient.belongsTo(User);

module.exports = Patient;
