"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const Medicine = sequelize.define(
  "medicine",
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
    qty: {
      type: Sequelize.INTEGER,
    },
    frequency: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("frequency")
          ? JSON.parse(this.getDataValue("frequency"))
          : {};
      },
      set: function (val) {
        return this.setDataValue("frequency", JSON.stringify(val));
      },
    },
    days: {
      type: Sequelize.INTEGER,
    },
  },
  {
    paranoid: true,
  }
);

User.hasMany(Medicine, {
  foreignKey: {
    allowNull: true,
  },
});
Medicine.belongsTo(User);

//Medicine.sync({ alter: true });

module.exports = Medicine;
