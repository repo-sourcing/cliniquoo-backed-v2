"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const crypto = require("crypto");
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
        let decipher = crypto.createDecipher("aes128", process.env.CYPHERKEY);
        let decrypted = decipher.update(storedValue, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted.toString();
      },
      set(value) {
        const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
        let encrypted = cipher.update(value, "utf8", "hex");
        encrypted += cipher.final("hex");
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
        let decipher = crypto.createDecipher("aes128", process.env.CYPHERKEY);
        let decrypted = decipher.update(storedValue.toString(), "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted.toString();
      },
      set(value) {
        const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
        let encrypted = cipher.update(value.toString(), "utf8", "hex");
        encrypted += cipher.final("hex");
        this.setDataValue("mobile", encrypted.toString());
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
