"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const { validate } = require("node-cron");

const User = sequelize.define(
  "user",
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
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: "Please enter a valid email address",
        },
        notEmpty: {
          msg: "Email address cannot be empty",
        },
      },
    },
    profilePic: {
      type: Sequelize.STRING,
    },
    mobile: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    about: {
      type: Sequelize.TEXT,
    },
    appVersion: {
      type: Sequelize.STRING,
    },
    device: {
      type: Sequelize.ENUM("Android", "IOS"),
    },
    dob: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    gender: {
      type: Sequelize.ENUM("M", "F", "O"),
      allowNull: false,
    },

    FcmToken: {
      type: Sequelize.TEXT,
    },
    degree: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [["BDS", "MDS"]],
          msg: "Degree must be either BDS or MDS",
        },
        notEmpty: {
          msg: "Degree cannot be empty",
        },
      },
    },
    specialization: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        specializationValidation(value) {
          if (this.degree === "MDS" && !value) {
            throw new Error("Specialization is required for MDS degree");
          }
        },
      },
    },
    registrationNumber: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    signature: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  }
);

module.exports = User;
