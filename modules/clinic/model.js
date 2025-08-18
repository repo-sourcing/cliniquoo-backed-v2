"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const User = require("../user/model");
const { encrypt, decrypt } = require("../../utils/encryption");

// Helper to normalize time ranges input (string or array) into
// an array of objects: [{ start: "HH:mm", end: "HH:mm" }, ...]
function parseTimeRanges(input) {
  if (!input) return [];
  const toObj = (s) => {
    const [start, end] = String(s)
      .split("-")
      .map((x) => (x || "").trim());
    return { start, end };
  };
  let arr = [];
  if (Array.isArray(input)) {
    arr = input.map((r) =>
      typeof r === "string" ? toObj(r) : { start: r.start, end: r.end }
    );
  } else if (typeof input === "string") {
    // e.g. "05:00-11:00,16:00-22:00"
    arr = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toObj);
  } else {
    // Unknown type
    return [];
  }
  const timeRe = /^(?:[01]\d|2[0-3]):[0-5]\d$/; // HH:mm 24h
  // sanitize and keep only valid ranges with start < end lexicographically (works for HH:mm)
  const valid = arr.filter(
    (r) =>
      timeRe.test(r.start || "") && timeRe.test(r.end || "") && r.start < r.end
  );
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
      get() {
        const storedValue = this.getDataValue("name");
        if (storedValue) {
          return decrypt(storedValue, process.env.CYPHERKEY);
        }
      },
      set(value) {
        const encrypted = encrypt(value, process.env.CYPHERKEY);
        this.setDataValue("name", encrypted);
      },
    },
    mobile: {
      type: Sequelize.STRING,
      allowNull: false,
      get() {
        const storedValue = this.getDataValue("mobile");
        if (storedValue) {
          return decrypt(storedValue, process.env.CYPHERKEY);
        }
      },
      set(value) {
        const encrypted = encrypt(value, process.env.CYPHERKEY);
        console.log(encrypted);
        this.setDataValue("mobile", encrypted);
      },
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
