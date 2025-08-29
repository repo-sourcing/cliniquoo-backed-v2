"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("treatments", "clinicId");
    await queryInterface.removeColumn("treatments", "patientId");
    await queryInterface.removeColumn("treatments", "toothNumber");
    await queryInterface.removeColumn("treatments", "status");

    await queryInterface.addColumn("treatments", "treatmentPlanId", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "treatmentPlans",
        key: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("transactions", "treatmentPlanId");
  },
};
