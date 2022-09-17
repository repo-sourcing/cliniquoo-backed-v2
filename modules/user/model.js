"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");

const User = sequelize.define(
  "user",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      isEmail: true,
    },
    profilePic: {
      type: Sequelize.STRING,
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
    about: {
      type: Sequelize.TEXT,
    },

    FcmToken: {
      type: Sequelize.TEXT,
    },
    clinicName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    clinicMobile: {
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

module.exports = User;
