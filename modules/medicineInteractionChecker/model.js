const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicineInteraction = sequelize.define(
    'MedicineInteraction',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      clinicId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
      },
      medicineId1: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      medicineId2: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      severityLevel: {
        type: DataTypes.ENUM('low', 'moderate', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'moderate'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      recommendation: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      conflictType: {
        type: DataTypes.ENUM('drug-drug', 'drug-food', 'drug-condition', 'drug-lab'),
        allowNull: false,
        defaultValue: 'drug-drug'
      }
    },
    {
      tableName: 'medicineInteractions',
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['clinicId'] },
        { fields: ['medicineId1', 'medicineId2'] },
        { fields: ['severityLevel'] },
        { fields: ['isActive'] },
        { fields: ['clinicId', 'isActive'] },
        { fields: ['clinicId', 'medicineId1', 'medicineId2'] }
      ]
    }
  );

  return MedicineInteraction;
};
