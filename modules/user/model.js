"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const crypto = require("crypto");

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
    },
    mobileUid: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      get() {
        const storedValue = this.getDataValue("name");
        let decipher = crypto.createDecipher("aes128", process.env.CYPHERKEY);
        let decrypted = decipher.update(storedValue.toString(), "hex", "utf8");
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

    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      get() {
        const storedValue = this.getDataValue("email");
        let decipher = crypto.createDecipher("aes128", process.env.CYPHERKEY);
        let decrypted = decipher.update(storedValue, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted.toString();
      },
      set(value) {
        const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
        let encrypted = cipher.update(value, "utf8", "hex");
        encrypted += cipher.final("hex");
        this.setDataValue("email", encrypted);
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
    about: {
      type: Sequelize.TEXT,
    },
    appVersion: {
      type: Sequelize.STRING,
    },
    device: {
      type: Sequelize.ENUM("Android", "IOS"),
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
