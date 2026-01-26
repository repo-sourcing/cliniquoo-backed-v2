const service = require('./service');
const { checkInteractionSchema, checkMultipleSchema, createInteractionSchema, updateInteractionSchema, warningQuerySchema, highRiskSchema, deactivateInteractionSchema } = require('./validation');
const { formatInteractionForDisplay, sortByRisk, isHighRiskInteraction } = require('./helpers');

exports.checkInteraction = async (req, res) => {
  try {
    const { clinicId, medicineId1, medicineId2 } = req.query;

    const { error } = checkInteractionSchema.validate({
      clinicId: parseInt(clinicId),
      medicineId1: parseInt(medicineId1),
      medicineId2: parseInt(medicineId2)
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const interaction = await service.checkInteraction(
      parseInt(medicineId1),
      parseInt(medicineId2),
      parseInt(clinicId)
    );

    return res.status(200).json({
      success: true,
      data: interaction
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.checkMultipleInteractions = async (req, res) => {
  try {
    const { clinicId, medicineIds } = req.body;

    const { error } = checkMultipleSchema.validate({
      clinicId,
      medicineIds
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const result = await service.checkMultipleInteractions(medicineIds, clinicId);

    return res.status(200).json({
      success: true,
      data: result,
      isSafe: !result.hasInteraction && result.combinedSeverity === 'none'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getWarnings = async (req, res) => {
  try {
    const { clinicId, severityLevel, limit, offset } = req.query;
    const parsedClinicId = parseInt(clinicId);
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    const { error } = warningQuerySchema.validate({
      clinicId: parsedClinicId,
      severityLevel,
      limit: parsedLimit,
      offset: parsedOffset
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const warnings = await service.getInteractionWarnings(parsedClinicId, severityLevel);

    return res.status(200).json({
      success: true,
      count: warnings.length,
      data: warnings
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getHighRiskInteractions = async (req, res) => {
  try {
    const { clinicId } = req.query;
    const parsedClinicId = parseInt(clinicId);

    const { error } = highRiskSchema.validate({
      clinicId: parsedClinicId
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const interactions = await service.getHighRiskInteractions(parsedClinicId);
    const sortedInteractions = sortByRisk(interactions);

    return res.status(200).json({
      success: true,
      count: sortedInteractions.length,
      data: sortedInteractions
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.createInteraction = async (req, res) => {
  try {
    const { clinicId, medicineId1, medicineId2, severityLevel, description, recommendation, conflictType } = req.body;

    const { error } = createInteractionSchema.validate({
      clinicId,
      medicineId1,
      medicineId2,
      severityLevel,
      description,
      recommendation,
      conflictType
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const interaction = await service.createInteraction(clinicId, {
      medicineId1,
      medicineId2,
      severityLevel,
      description,
      recommendation,
      conflictType
    });

    return res.status(201).json({
      success: true,
      data: formatInteractionForDisplay(interaction)
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateInteraction = async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { clinicId, severityLevel, description, recommendation, isActive } = req.body;
    const parsedInteractionId = parseInt(interactionId);

    const { error } = updateInteractionSchema.validate({
      interactionId: parsedInteractionId,
      clinicId,
      severityLevel,
      description,
      recommendation,
      isActive
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const interaction = await service.updateInteraction(parsedInteractionId, clinicId, {
      severityLevel,
      description,
      recommendation,
      isActive
    });

    return res.status(200).json({
      success: true,
      data: formatInteractionForDisplay(interaction)
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deactivateInteraction = async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { clinicId } = req.body;
    const parsedInteractionId = parseInt(interactionId);

    const { error } = deactivateInteractionSchema.validate({
      interactionId: parsedInteractionId,
      clinicId
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    await service.deactivateInteraction(parsedInteractionId, clinicId);

    return res.status(204).end();
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
