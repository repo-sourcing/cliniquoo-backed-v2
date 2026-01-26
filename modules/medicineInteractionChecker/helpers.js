exports.calculateSeverityScore = (severityLevel) => {
  const severityScores = {
    low: 1,
    moderate: 2,
    high: 3,
    critical: 4
  };
  return severityScores[severityLevel] || 0;
};

exports.generateWarningMessage = (interaction) => {
  const severityEmoji = {
    low: '⚠️',
    moderate: '⚠️ ⚠️',
    high: '🚨 🚨',
    critical: '🚨 🚨 🚨'
  };

  const emoji = severityEmoji[interaction.severity] || '⚠️';
  return `${emoji} Medicine Interaction: ${interaction.description}. Recommendation: ${interaction.recommendation}`;
};

exports.isCriticalInteraction = (severityLevel) => {
  return severityLevel === 'critical';
};

exports.isHighRiskInteraction = (severityLevel) => {
  return severityLevel === 'high' || severityLevel === 'critical';
};

exports.formatInteractionForDisplay = (interaction) => {
  return {
    interactionId: interaction.id,
    medicine1: interaction.medicineId1,
    medicine2: interaction.medicineId2,
    severity: interaction.severityLevel,
    severityScore: exports.calculateSeverityScore(interaction.severityLevel),
    conflictType: interaction.conflictType,
    description: interaction.description,
    recommendation: interaction.recommendation,
    isCritical: exports.isCriticalInteraction(interaction.severityLevel),
    isHighRisk: exports.isHighRiskInteraction(interaction.severityLevel)
  };
};

exports.groupInteractionsBySeverity = (interactions) => {
  const grouped = {
    critical: [],
    high: [],
    moderate: [],
    low: []
  };

  interactions.forEach(interaction => {
    grouped[interaction.severity].push(interaction);
  });

  return grouped;
};

exports.calculateRiskLevel = (severities) => {
  if (severities.length === 0) return { level: 'safe', score: 0 };
  
  const scoreSum = severities.reduce((sum, sev) => {
    return sum + exports.calculateSeverityScore(sev);
  }, 0);

  const avgScore = scoreSum / severities.length;

  if (avgScore >= 3.5) return { level: 'critical', score: avgScore };
  if (avgScore >= 2.5) return { level: 'high', score: avgScore };
  if (avgScore >= 1.5) return { level: 'moderate', score: avgScore };
  return { level: 'low', score: avgScore };
};

exports.validateMedicineIds = (medicineId1, medicineId2) => {
  if (!Number.isInteger(medicineId1) || medicineId1 <= 0) {
    return { valid: false, error: 'medicineId1 must be a positive integer' };
  }
  if (!Number.isInteger(medicineId2) || medicineId2 <= 0) {
    return { valid: false, error: 'medicineId2 must be a positive integer' };
  }
  if (medicineId1 === medicineId2) {
    return { valid: false, error: 'medicineId1 and medicineId2 must be different' };
  }
  return { valid: true };
};

exports.filterBySeverity = (interactions, minSeverity) => {
  const severityLevels = { low: 1, moderate: 2, high: 3, critical: 4 };
  const minScore = severityLevels[minSeverity] || 0;

  return interactions.filter(i => {
    return severityLevels[i.severity] >= minScore;
  });
};

exports.sortByRisk = (interactions) => {
  const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
  return interactions.sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

exports.formatInteractionList = (interactions) => {
  return interactions.map(i => ({
    id: i.id,
    medicineId1: i.medicineId1,
    medicineId2: i.medicineId2,
    severity: i.severityLevel,
    conflictType: i.conflictType,
    description: i.description.substring(0, 100) + (i.description.length > 100 ? '...' : '')
  }));
};
