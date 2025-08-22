"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const Medicine = require("../medicine/model");
const FrequentlyUsedMedicine = sequelize.define(
  "frequentlyUsedMedicine",
  {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  },
  {
    paranoid: true,
  }
);
User.hasMany(FrequentlyUsedMedicine, {
  foreignKey: {
    allowNull: false,
  },
});
FrequentlyUsedMedicine.belongsTo(User);

Medicine.hasMany(FrequentlyUsedMedicine, {
  foreignKey: {
    allowNull: false,
  },
});
FrequentlyUsedMedicine.belongsTo(Medicine);

//FrequentlyUsedMedicine.sync();

module.exports = FrequentlyUsedMedicine;
