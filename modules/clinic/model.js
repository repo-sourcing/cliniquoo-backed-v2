"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
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
    },
    mobile: {
      type: Sequelize.BIGINT,
      unique: true,
      allowNull: false,
      validate: {
        not: {
          args: ["[a-z]", "i"],
          msg: "Please enter a valid number",
        },
        len: {
          args: [10, 10],
          msg: "length of the phone number is 10",
        },
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
