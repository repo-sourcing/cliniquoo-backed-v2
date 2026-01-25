const bulkImportService = require('./service');
const { createImportSchema, importIdSchema, queryImportsSchema } = require('./validation');
const { formatImportResult } = require('./helpers');

exports.createImport = async (req, res) => {
  try {
    const { clinicId } = req.body;
    const file = req.file;

    // Validate input
    const { error } = createImportSchema.validate({ clinicId, file });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit'
      });
    }

    // Check file type
    if (!file.mimetype.includes('text/csv') && !file.originalname.endsWith('.csv')) {
      return res.status(400).json({
        success: false,
        message: 'Only CSV files are supported'
      });
    }

    // Create import job
    const job = await bulkImportService.createImportJob(
      clinicId,
      req.user.id,
      file.originalname,
      file.size
    );

    // Start async import
    await bulkImportService.updateJobStatus(job.id, 'processing');

    // Import patients (synchronous for test consistency)
    const csvData = file.buffer.toString('utf8');
    await bulkImportService.importPatients(job.id, csvData, clinicId);

    // Fetch updated job
    const completedJob = await bulkImportService.getJobById(job.id, clinicId);

    return res.status(201).json({
      success: true,
      data: formatImportResult(completedJob)
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getImportJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { clinicId } = req.query;

    // Validate input
    const { error } = importIdSchema.validate({ jobId: parseInt(jobId), clinicId: parseInt(clinicId) });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const job = await bulkImportService.getJobById(jobId, clinicId);
    return res.status(200).json({
      success: true,
      data: formatImportResult(job)
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

exports.getImportJobs = async (req, res) => {
  try {
    const { clinicId, status, limit, offset } = req.query;
    const parsedClinicId = parseInt(clinicId);
    const parsedLimit = parseInt(limit) || 10;
    const parsedOffset = parseInt(offset) || 0;

    // Validate input
    const { error } = queryImportsSchema.validate({
      clinicId: parsedClinicId,
      status,
      limit: parsedLimit,
      offset: parsedOffset
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const jobs = await bulkImportService.getJobsByClinic(parsedClinicId, {
      limit: parsedLimit,
      offset: parsedOffset,
      status
    });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs.map(job => formatImportResult(job))
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getImportStats = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId || isNaN(parseInt(jobId))) {
      return res.status(400).json({
        success: false,
        message: 'jobId is required and must be a valid integer'
      });
    }

    const stats = await bulkImportService.getJobStats(jobId);
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteImport = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { clinicId } = req.query;

    if (!jobId || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'jobId and clinicId are required'
      });
    }

    await bulkImportService.deleteJob(jobId, clinicId);
    return res.status(204).end();
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
};
