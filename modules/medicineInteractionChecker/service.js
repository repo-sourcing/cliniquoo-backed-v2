const db = require('../../config/db');
const { Op, fn, col } = require('sequelize');

const MedicineInteraction = db.models.MedicineInteraction;

exports.checkInteraction = async (medicineId1, medicineId2, clinicId) => {
  try {
    const interaction = await MedicineInteraction.findOne({
      where: {
        clinicId,
        isActive: true,
        [Op.or]: [
          { medicineId1, medicineId2 },
          { medicineId1: medicineId2, medicineId2: medicineId1 }
        ]
      }
    });

    if (!interaction) {
      return {
        hasInteraction: false,
        severity: null,
        description: null
      };
    }

    return {
      hasInteraction: true,
      severity: interaction.severityLevel,
      description: interaction.description,
      recommendation: interaction.recommendation,
      conflictType: interaction.conflictType
    };
  } catch (error) {
    throw new Error(`Interaction check failed: ${error.message}`);
  }
};

exports.checkMultipleInteractions = async (medicineIds, clinicId) => {
  try {
    if (!Array.isArray(medicineIds) || medicineIds.length < 2) {
      return { interactions: [], combinedSeverity: 'none' };
    }

    const interactions = [];
    const severities = [];

    for (let i = 0; i < medicineIds.length; i++) {
      for (let j = i + 1; j < medicineIds.length; j++) {
        const interaction = await exports.checkInteraction(
          medicineIds[i],
          medicineIds[j],
          clinicId
        );

        if (interaction.hasInteraction) {
          interactions.push({
            medicine1Id: medicineIds[i],
            medicine2Id: medicineIds[j],
            ...interaction
          });
          severities.push(interaction.severity);
        }
      }
    }

    const combinedSeverity = exports.calculateCombinedSeverity(severities);

    return {
      interactions,
      combinedSeverity,
      count: interactions.length,
      hasCriticalInteraction: severities.includes('critical')
    };
  } catch (error) {
    throw new Error(`Multiple interaction check failed: ${error.message}`);
  }
};

exports.getInteractionWarnings = async (clinicId, severityLevel = null) => {
  try {
    const where = { clinicId, isActive: true };
    if (severityLevel) {
      where.severityLevel = severityLevel;
    }

    const warnings = await MedicineInteraction.findAll({
      where,
      order: [['severityLevel', 'DESC'], ['createdAt', 'DESC']],
      limit: 100
    });

    return warnings.map(w => ({
      id: w.id,
      medicineId1: w.medicineId1,
      medicineId2: w.medicineId2,
      severity: w.severityLevel,
      description: w.description,
      recommendation: w.recommendation,
      conflictType: w.conflictType
    }));
  } catch (error) {
    throw new Error(`Failed to fetch warnings: ${error.message}`);
  }
};

exports.getHighRiskInteractions = async (clinicId) => {
  try {
    const highRiskSeverities = ['high', 'critical'];
    const interactions = await MedicineInteraction.findAll({
      where: {
        clinicId,
        isActive: true,
        severityLevel: {
          [Op.in]: highRiskSeverities
        }
      },
      order: [['severityLevel', 'DESC']],
      limit: 50
    });

    return interactions.map(i => ({
      id: i.id,
      medicine1Id: i.medicineId1,
      medicine2Id: i.medicineId2,
      severity: i.severityLevel,
      conflictType: i.conflictType,
      description: i.description
    }));
  } catch (error) {
    throw new Error(`Failed to fetch high-risk interactions: ${error.message}`);
  }
};

exports.createInteraction = async (clinicId, data) => {
  try {
    const { medicineId1, medicineId2, severityLevel, description, recommendation, conflictType } = data;

    // Normalize IDs to ensure consistency
    const id1 = Math.min(medicineId1, medicineId2);
    const id2 = Math.max(medicineId1, medicineId2);

    // Check for duplicates
    const existing = await MedicineInteraction.findOne({
      where: {
        clinicId,
        medicineId1: id1,
        medicineId2: id2
      }
    });

    if (existing) {
      throw new Error('This interaction already exists for this clinic');
    }

    const interaction = await MedicineInteraction.create({
      clinicId,
      medicineId1: id1,
      medicineId2: id2,
      severityLevel,
      description,
      recommendation,
      conflictType: conflictType || 'drug-drug',
      isActive: true
    });

    return interaction;
  } catch (error) {
    throw new Error(`Failed to create interaction: ${error.message}`);
  }
};

exports.updateInteraction = async (interactionId, clinicId, updates) => {
  try {
    const interaction = await MedicineInteraction.findOne({
      where: { id: interactionId, clinicId }
    });

    if (!interaction) {
      throw new Error('Interaction not found');
    }

    // Only allow updating specific fields
    const allowedUpdates = ['severityLevel', 'description', 'recommendation', 'isActive'];
    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    });

    await interaction.update(filteredUpdates);
    return interaction;
  } catch (error) {
    throw new Error(`Failed to update interaction: ${error.message}`);
  }
};

exports.deactivateInteraction = async (interactionId, clinicId) => {
  try {
    const interaction = await MedicineInteraction.findOne({
      where: { id: interactionId, clinicId }
    });

    if (!interaction) {
      throw new Error('Interaction not found');
    }

    await interaction.update({ isActive: false });
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to deactivate interaction: ${error.message}`);
  }
};

exports.calculateCombinedSeverity = (severities) => {
  if (severities.length === 0) return 'none';
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('moderate')) return 'moderate';
  return 'low';
};
