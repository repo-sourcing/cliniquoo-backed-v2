const db = require('../../config/db');
const { parseCSV, transformPatientData } = require('./helpers');

const ImportJob = db.models.ImportJob;
const Patient = db.models.Patient;
const sequelize = db.sequelize;

exports.createImportJob = async (clinicId, userId, fileName, fileSize) => {
  try {
    const job = await ImportJob.create({
      clinicId,
      fileName,
      fileSize,
      createdBy: userId,
      status: 'pending'
    });
    return job;
  } catch (error) {
    throw new Error(`Failed to create import job: ${error.message}`);
  }
};

exports.updateJobStatus = async (jobId, status, updates = {}) => {
  try {
    const job = await ImportJob.findByPk(jobId);
    if (!job) throw new Error('Import job not found');

    const updateData = { status, ...updates };
    if (status === 'processing') {
      updateData.startedAt = new Date();
    }
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await job.update(updateData);
    return job;
  } catch (error) {
    throw new Error(`Failed to update job status: ${error.message}`);
  }
};

exports.importPatients = async (jobId, csvData, clinicId) => {
  const transaction = await sequelize.transaction();
  try {
    const job = await ImportJob.findByPk(jobId);
    if (!job) throw new Error('Import job not found');

    // Parse CSV data
    const rows = await parseCSV(csvData);
    job.totalRows = rows.length;
    await job.save({ transaction });

    const results = {
      success: [],
      failures: []
    };

    // Process each row with clinic isolation
    for (let i = 0; i < rows.length; i++) {
      try {
        const rawData = rows[i];
        const patientData = transformPatientData(rawData, clinicId);

        // Validate required fields
        if (!patientData.name || !patientData.clinicId) {
          throw new Error('Missing required fields: name and clinicId');
        }

        // Check for duplicates within clinic
        const existing = await Patient.findOne({
          where: {
            clinicId,
            phone: patientData.phone || null
          },
          transaction
        });

        if (existing) {
          throw new Error(`Patient with phone ${patientData.phone} already exists in this clinic`);
        }

        // Create patient
        const patient = await Patient.create(patientData, { transaction });
        results.success.push({
          row: i + 2,
          patientId: patient.id,
          name: patient.name
        });

        job.successCount += 1;
      } catch (rowError) {
        results.failures.push({
          row: i + 2,
          error: rowError.message,
          data: rows[i]
        });
        job.failureCount += 1;
      }
    }

    // Update job with results
    const errorLog = results.failures.slice(0, 100); // Keep first 100 errors
    await job.update(
      {
        successCount: job.successCount,
        failureCount: job.failureCount,
        errorLog,
        status: job.failureCount > 0 ? 'completed' : 'completed'
      },
      { transaction }
    );

    await transaction.commit();
    return results;
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Import failed: ${error.message}`);
  }
};

exports.getJobById = async (jobId, clinicId) => {
  try {
    const job = await ImportJob.findOne({
      where: {
        id: jobId,
        clinicId
      }
    });
    if (!job) throw new Error('Import job not found');
    return job;
  } catch (error) {
    throw new Error(`Failed to fetch job: ${error.message}`);
  }
};

exports.getJobsByClinic = async (clinicId, options = {}) => {
  try {
    const { limit = 10, offset = 0, status = null } = options;
    const where = { clinicId };
    if (status) where.status = status;

    const jobs = await ImportJob.findAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    return jobs;
  } catch (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }
};

exports.getJobStats = async (jobId) => {
  try {
    const job = await ImportJob.findByPk(jobId);
    if (!job) throw new Error('Import job not found');

    const stats = {
      totalRows: job.totalRows,
      successCount: job.successCount,
      failureCount: job.failureCount,
      successRate: job.totalRows > 0 ? ((job.successCount / job.totalRows) * 100).toFixed(2) : 0,
      status: job.status,
      errorCount: job.errorLog ? job.errorLog.length : 0
    };
    return stats;
  } catch (error) {
    throw new Error(`Failed to fetch job stats: ${error.message}`);
  }
};

exports.deleteJob = async (jobId, clinicId) => {
  try {
    const job = await ImportJob.findOne({
      where: { id: jobId, clinicId }
    });
    if (!job) throw new Error('Import job not found');

    await job.destroy();
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete job: ${error.message}`);
  }
};
