"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Visitor = require("../visitor/model");
const ScheduleCron = sequelize.define("scheduleCron", {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  time: { type: Sequelize.DATE, allowNull: false },
  status: {
    type: Sequelize.ENUM("scheduled", "rescheduled"),
    defaultValue: "scheduled",
  },
});

Visitor.hasMany(ScheduleCron, { onDelete: "CASCADE" });
ScheduleCron.belongsTo(Visitor, { onDelete: "CASCADE" });

//ScheduleCron.sync();

module.exports = ScheduleCron;
