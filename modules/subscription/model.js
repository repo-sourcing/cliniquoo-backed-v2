"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Subscription = sequelize.define(
  "subscription",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: Sequelize.STRING, allowNull: false },
    day: { type: Sequelize.INTEGER, allowNull: false },
    price: { type: Sequelize.FLOAT, allowNull: false },
    tag: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("tag")
          ? JSON.parse(this.getDataValue("tag"))
          : [];
      },
      set: function (val) {
        return this.setDataValue(
          "tag",
          JSON.stringify(String(val || "").split(","))
        );
      },
    },
    planType: { type: Sequelize.STRING, allowNull: false }, //basic , pro
    offerPercentage: { type: Sequelize.FLOAT, defaultValue: 0 },
  },
  {
    paranoid: true,
  }
);

module.exports = Subscription;
