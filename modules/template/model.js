"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");

const Template = sequelize.define(
  "template",
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
    notes: {
      type: Sequelize.STRING,
    },
    prescription: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("prescription")
          ? JSON.parse(this.getDataValue("prescription"))
          : {};
      },
      set: function (val) {
        return this.setDataValue("prescription", JSON.stringify(val));
      },
    },
  },
  {
    paranoid: true,
  }
);
User.hasMany(Template, {
  foreignKey: {
    allowNull: false,
  },
});
Template.belongsTo(User);

//Template.sync();

module.exports = Template;
