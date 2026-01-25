const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ImportJob = sequelize.define(
    "ImportJob",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      clinicId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      totalRows: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failureCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      errorLog: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "importJobs",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["clinicId"] },
        { fields: ["status"] },
        { fields: ["clinicId", "status"] },
      ],
    },
  );

  return ImportJob;
};
