"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");

// Helper to normalize time ranges input (string or array) into
// an array of objects: [{ start: "HH:mm", end: "HH:mm" }, ...]
function parseTimeRanges(input) {
  if (!input) return [];
  const timeHHmm = /^([01]\d|2[0-3]):[0-5]\d$/; // 24h HH:mm
  const toObj = (s) => {
    const [start, end] = String(s)
      .split("-")
      .map((x) => (x || "").trim());
    return { start, end };
  };
  let arr = [];
  if (Array.isArray(input)) {
    arr = input.map((r) =>
      typeof r === "string"
        ? toObj(r)
        : {
            start: String(r.start || r.starts || "").trim(),
            end: String(r.end || "").trim(),
          }
    );
  } else if (typeof input === "string") {
    // e.g. "05:00-11:00,16:00-00:00"
    arr = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toObj);
  } else {
    // Unknown type
    return [];
  }

  // Keep original values, validate format and non-zero length only
  const valid = arr.filter((r) => {
    const s = r.start || "";
    const e = r.end || "";
    if (!timeHHmm.test(s) || !timeHHmm.test(e)) return false;
    if (s === e) return false; // zero-length not allowed
    return true;
  });

  return valid;
}

const Clinic = sequelize.define(
  "clinic",
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
    mobile: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    location: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    dayOff: {
      type: Sequelize.TEXT,
      get: function () {
        return this.getDataValue("dayOff")
          ? JSON.parse(this.getDataValue("dayOff"))
          : [];
      },
      set: function (val) {
        return this.setDataValue(
          "dayOff",
          JSON.stringify(String(val || "").split(","))
        );
      },
    },
    // New: enable time-wise scheduling for a clinic
    scheduleByTime: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    // New: list of daily time ranges (shifts) when scheduleByTime is true
    // Stored as native JSON in DB, returned as array of {start,end}
    timeRanges: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
      set(val) {
        const normalized = parseTimeRanges(val);
        this.setDataValue("timeRanges", normalized);
      },
    },
  },
  {
    paranoid: true,
  }
);

User.hasMany(Clinic, {
  foreignKey: {
    allowNull: false,
  },
});
Clinic.belongsTo(User);

module.exports = Clinic;
