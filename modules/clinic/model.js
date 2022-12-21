"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const crypto = require("crypto");
const Clinic = sequelize.define(
  "clinic",
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
        var decipher = crypto.createDecipher("aes128", process.env.CYPHERKEY);
        var decrypted = decipher.update(storedValue, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted.toString();
      },
      set(value) {
        const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
        var encrypted = cipher.update(value, "utf8", "hex");
        encrypted += cipher.final("hex");
        this.setDataValue("name", encrypted);
      },
    },
    mobile: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
      get() {
        const storedValue = this.getDataValue("mobile");
        var decipher = crypto.createDecipher("aes128", process.env.CYPHERKEY);
        var decrypted = decipher.update(storedValue.toString(), "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted.toString();
      },
      set(value) {
        const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
        var encrypted = cipher.update(value.toString(), "utf8", "hex");
        encrypted += cipher.final("hex");
        this.setDataValue("mobile", encrypted.toString());
      },
    },
    location: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    dayOff: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("dayOff")
          ? JSON.parse(this.getDataValue("dayOff"))
          : [];
      },
      set: function (val) {
        return this.setDataValue("dayOff", JSON.stringify(val.split(",")));
      },
    },
  },
  {
    paranoid: true,
    alter: true,
  }
);

User.hasMany(Clinic, {
  foreignKey: {
    allowNull: false,
  },
});
Clinic.belongsTo(User);
module.exports = Clinic;
