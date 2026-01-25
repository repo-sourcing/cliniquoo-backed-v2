const csv = require('csv-parse/sync');

exports.parseCSV = async (csvData) => {
  try {
    if (!csvData) {
      throw new Error('CSV data is empty');
    }

    const records = csv.parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    return records;
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
};

exports.transformPatientData = (rawData, clinicId) => {
  try {
    return {
      clinicId,
      name: (rawData.name || '').trim(),
      email: (rawData.email || '').trim() || null,
      phone: (rawData.phone || '').trim() || null,
      dateOfBirth: rawData.dateOfBirth ? new Date(rawData.dateOfBirth) : null,
      gender: (rawData.gender || '').toUpperCase().match(/^(M|F|O)$/) ? rawData.gender.toUpperCase() : null,
      address: (rawData.address || '').trim() || null,
      city: (rawData.city || '').trim() || null,
      state: (rawData.state || '').trim() || null,
      zipCode: (rawData.zipCode || '').trim() || null,
      medicalHistory: (rawData.medicalHistory || '').trim() || null,
      allergies: (rawData.allergies || '').trim() || null,
      emergencyContact: (rawData.emergencyContact || '').trim() || null,
      emergencyPhone: (rawData.emergencyPhone || '').trim() || null,
      insuranceProvider: (rawData.insuranceProvider || '').trim() || null,
      insurancePolicyNumber: (rawData.insurancePolicyNumber || '').trim() || null,
      notes: (rawData.notes || '').trim() || null
    };
  } catch (error) {
    throw new Error(`Data transformation failed: ${error.message}`);
  }
};

exports.validatePatientRow = (row) => {
  const errors = [];

  if (!row.name || row.name.trim().length === 0) {
    errors.push('name is required');
  }

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('email format is invalid');
  }

  if (row.phone && !/^\d{7,15}$/.test(row.phone.replace(/[-\s]/g, ''))) {
    errors.push('phone format is invalid');
  }

  if (row.gender && !['M', 'F', 'O'].includes(row.gender.toUpperCase())) {
    errors.push('gender must be M, F, or O');
  }

  if (row.dateOfBirth) {
    const date = new Date(row.dateOfBirth);
    if (isNaN(date.getTime())) {
      errors.push('dateOfBirth format is invalid (use YYYY-MM-DD)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

exports.calculateSuccessRate = (successCount, totalRows) => {
  if (totalRows === 0) return 0;
  return ((successCount / totalRows) * 100).toFixed(2);
};

exports.formatImportResult = (job) => {
  return {
    jobId: job.id,
    status: job.status,
    fileName: job.fileName,
    totalRows: job.totalRows,
    successCount: job.successCount,
    failureCount: job.failureCount,
    successRate: exports.calculateSuccessRate(job.successCount, job.totalRows),
    processedAt: job.completedAt,
    errorCount: job.errorLog ? job.errorLog.length : 0
  };
};

exports.chunkArray = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};
