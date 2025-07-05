"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const crypto = require("crypto");
const { decrypt, encrypt } = require("../../utils/encryption");
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
      get() {
        const storedValue = this.getDataValue("name");
        if (storedValue) {
          return decrypt(storedValue, process.env.CYPHERKEY);
        }
      },
      set(value) {
        const encrypted = encrypt(value, process.env.CYPHERKEY);
        this.setDataValue("name", encrypted);
      },
    },
    location: {
      type: Sequelize.STRING,
    },
    mobile: {
      type: Sequelize.STRING,
      allowNull: false,
      get() {
        const storedValue = this.getDataValue("mobile");
        if (storedValue) {
          return decrypt(storedValue, process.env.CYPHERKEY);
        }
      },
      set(value) {
        const encrypted = encrypt(value.toString(), process.env.CYPHERKEY);
        this.setDataValue("mobile", encrypted);
      },
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
  },
  {
    paranoid: true,
  }
);

User.hasMany(Patient);
Patient.belongsTo(User);

module.exports = Patient;
