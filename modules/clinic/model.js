"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const { encrypt, decrypt } = require("../../utils/encryption");
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
        if (storedValue) {
          return decrypt(storedValue, process.env.CYPHERKEY);
        }
      },
      set(value) {
        const encrypted = encrypt(value, process.env.CYPHERKEY);
        this.setDataValue("name", encrypted);
      },
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
        const encrypted = encrypt(value, process.env.CYPHERKEY);
        console.log(encrypted);
        this.setDataValue("mobile", encrypted);
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
  }
);

User.hasMany(Clinic, {
  foreignKey: {
    allowNull: false,
  },
});
Clinic.belongsTo(User);
module.exports = Clinic;
