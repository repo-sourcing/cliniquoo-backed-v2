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
    emailUid: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    mobileUid: {
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
  },
  {
    paranoid: true,
  }
);

module.exports = User;
