"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const Clinic = require("../clinic/model");
const Patient = require("../patient/model");

function normalizeTimeSlot(val) {
  if (!val) return [];
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
  let pair = [];
  if (Array.isArray(val)) {
    pair = val.map((v) => String(v).trim());
  } else if (typeof val === "string") {
    // supports "10:00-11:00" or "10:00,11:00"
    const cleaned = val.replace(" to ", "-").replace(/\s+/g, "");
    pair = cleaned.includes("-") ? cleaned.split("-") : cleaned.split(",");
  }
  if (pair.length !== 2) return [];
  const [start, end] = pair;
  if (!timeRe.test(start) || !timeRe.test(end)) return [];
  // accept only 1-hour range on hour boundaries
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (sm !== 0 || em !== 0) return [];
  const duration = eh * 60 + em - (sh * 60 + sm);
  if (duration !== 60) return [];
  return [start, end];
}

const Visitor = sequelize.define("visitor", {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  date: { type: Sequelize.DATEONLY, allowNull: false },
  // time range as [start,end] in HH:mm
  timeSlot: {
    type: Sequelize.JSON,
    allowNull: true,
    get() {
      const v = this.getDataValue("timeSlot");
      return Array.isArray(v) ? v : [];
    },
    set(val) {
      const normalized = normalizeTimeSlot(val);
      this.setDataValue("timeSlot", normalized.length ? normalized : null);
    },
  },
  isCanceled: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  isVisited: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  isSchedule: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

Clinic.hasMany(Visitor);
Visitor.belongsTo(Clinic);

Patient.hasMany(Visitor);
Visitor.belongsTo(Patient);

module.exports = Visitor;
