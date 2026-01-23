"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");

const AppointmentReminder = sequelize.define(
  "appointmentReminder",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    clinicId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "clinics", key: "id" },
    },
    reminderType: {
      type: Sequelize.ENUM("SMS", "Email", "WhatsApp"),
      allowNull: false,
      defaultValue: "SMS",
      validate: {
        isIn: [["SMS", "Email", "WhatsApp"]],
      },
    },
    timeBeforeAppointment: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: "Minutes before appointment",
      validate: {
        min: 1,
        isInt: true,
      },
    },
    isEnabled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    tableName: "appointment_reminders",
    timestamps: true,
    indexes: [
      { fields: ["clinicId"] },
      { fields: ["userId"] },
      { fields: ["isEnabled"] },
      { fields: ["clinicId", "isEnabled"] },
    ],
  },
);

module.exports = AppointmentReminder;
