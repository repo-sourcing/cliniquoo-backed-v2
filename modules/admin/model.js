"use strict";
const Sequelize = require("sequelize");
const sequelize = require("../../config/db");
const bcrypt = require("bcrypt");

const Admin = sequelize.define(
  "admin",
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
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      isEmail: true,
      unique: true,
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    hooks: {
      beforeCreate: (Admin) => {
        const salt = bcrypt.genSaltSync();
        Admin.password = bcrypt.hashSync(Admin.password, salt);
      },
    },
  }
);

// Admin.prototype.validPassword = async function (password) {
//   return await bcrypt.compare(`${password}`, `${this.password}`);
// };

module.exports = Admin;
