"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const crypto = require("crypto");
const { decrypt, encrypt } = require("../../utils/encryption");

// Encryption utility functions
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // For AES, this is always 16

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
      get() {
        const storedValue = this.getDataValue("name");
        if (storedValue) {
          return decrypt(storedValue, process.env.CYPHERKEY);
        }
        return null;
      },
      set(value) {
        if (value) {
          const encrypted = encrypt(value, process.env.CYPHERKEY);
          this.setDataValue("name", encrypted);
        }
      },
    },

    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      get() {
        const storedValue = this.getDataValue("email");
        if (storedValue) {
          return decrypt(storedValue, process.env.CYPHERKEY);
        }
        return null;
      },
      set(value) {
        if (value) {
          const encrypted = encrypt(value, process.env.CYPHERKEY);
          this.setDataValue("email", encrypted);
        }
      },
    },
    profilePic: {
      type: Sequelize.STRING,
    },
    mobile: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
      get() {
        const storedValue = this.getDataValue("mobile");
        if (storedValue) {
          return decrypt(storedValue, process.env.CYPHERKEY);
        }
        return null;
      },
      set(value) {
        if (value) {
          const encrypted = encrypt(value.toString(), process.env.CYPHERKEY);
          this.setDataValue("mobile", encrypted);
        }
      },
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
  },
  {
    paranoid: true,
  }
);

module.exports = User;
