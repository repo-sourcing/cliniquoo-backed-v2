"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("patients", "discountAmount");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("patients", "discountAmount", {
      type: Sequelize.FLOAT,
      defaultValue: 0,
    });
  },
};
