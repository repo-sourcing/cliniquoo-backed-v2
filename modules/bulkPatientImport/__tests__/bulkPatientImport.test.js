// Mock all dependencies before requiring the actual modules
jest.mock('../helpers.js', () => ({
  parseCSV: jest.fn(),
  transformPatientData: jest.fn(),
  validatePatientRow: jest.fn(),
  calculateSuccessRate: jest.fn(),
  formatImportResult: jest.fn(),
  chunkArray: jest.fn()
}));

jest.mock('../service.js');
jest.mock('../../../config/db', () => ({
  sequelize: {},
  models: {}
}));

const controller = require('../controller');
const service = require('../service');
const helpers = require('../helpers');

describe('Bulk Patient Import', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 1 },
      file: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Create Import', () => {
    it('should create import job with valid CSV file', async () => {
      req.body = { clinicId: 1 };
      req.file = {
        originalname: 'patients.csv',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.from('name,email,phone\nJohn Doe,john@example.com,1234567890')
      };

      service.createImportJob.mockResolvedValue({ id: 1, status: 'pending' });
      service.updateJobStatus.mockResolvedValue({ id: 1, status: 'processing' });
      service.importPatients.mockResolvedValue({ success: [{ row: 2 }], failures: [] });
      service.getJobById.mockResolvedValue({
        id: 1,
        fileName: 'patients.csv',
        totalRows: 1,
        successCount: 1,
        failureCount: 0,
        status: 'completed',
        completedAt: new Date(),
        errorLog: []
      });
      helpers.formatImportResult.mockReturnValue({
        jobId: 1,
        status: 'completed',
        successCount: 1,
        totalRows: 1
      });

      await controller.createImport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ jobId: 1 })
        })
      );
    });

    it('should reject file exceeding 5MB size limit', async () => {
      req.body = { clinicId: 1 };
      req.file = {
        originalname: 'large.csv',
        mimetype: 'text/csv',
        size: 6 * 1024 * 1024 // 6MB
      };

      await controller.createImport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('5MB')
        })
      );
    });

    it('should reject non-CSV file types', async () => {
      req.body = { clinicId: 1 };
      req.file = {
        originalname: 'patients.xlsx',
        mimetype: 'application/vnd.ms-excel',
        size: 1024
      };

      await controller.createImport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('CSV')
        })
      );
    });

    it('should return 400 when clinicId is missing', async () => {
      req.body = {};
      req.file = {
        originalname: 'patients.csv',
        mimetype: 'text/csv',
        size: 1024
      };

      await controller.createImport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should handle import service errors gracefully', async () => {
      req.body = { clinicId: 1 };
      req.file = {
        originalname: 'patients.csv',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.from('name,email')
      };

      service.createImportJob.mockRejectedValue(
        new Error('Database connection failed')
      );

      await controller.createImport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Database')
        })
      );
    });
  });

  describe('Get Import Job', () => {
    it('should retrieve import job by ID', async () => {
      req.params = { jobId: '1' };
      req.query = { clinicId: '1' };

      service.getJobById.mockResolvedValue({
        id: 1,
        clinicId: 1,
        status: 'completed',
        successCount: 10,
        failureCount: 0,
        totalRows: 10,
        completedAt: new Date(),
        errorLog: []
      });
      helpers.formatImportResult.mockReturnValue({
        jobId: 1,
        status: 'completed',
        successCount: 10,
        totalRows: 10
      });

      await controller.getImportJob(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ jobId: 1 })
        })
      );
    });

    it('should return 404 when job not found', async () => {
      req.params = { jobId: '999' };
      req.query = { clinicId: '1' };

      service.getJobById.mockRejectedValue(
        new Error('Import job not found')
      );

      await controller.getImportJob(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should validate jobId and clinicId parameters', async () => {
      req.params = { jobId: 'invalid' };
      req.query = { clinicId: '1' };

      await controller.getImportJob(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Get Import Jobs', () => {
    it('should list all jobs for clinic with default pagination', async () => {
      req.query = { clinicId: '1' };

      const mockJobs = [
        { id: 1, status: 'completed', successCount: 5, totalRows: 5 },
        { id: 2, status: 'pending', successCount: 0, totalRows: 10 }
      ];

      service.getJobsByClinic.mockResolvedValue(mockJobs);
      helpers.formatImportResult.mockImplementation(job => ({
        jobId: job.id,
        status: job.status
      }));

      await controller.getImportJobs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2,
          data: expect.arrayContaining([
            expect.objectContaining({ jobId: 1 })
          ])
        })
      );
    });

    it('should filter jobs by status', async () => {
      req.query = { clinicId: '1', status: 'completed', limit: '10', offset: '0' };

      const completedJobs = [
        { id: 1, status: 'completed', successCount: 5, totalRows: 5 }
      ];

      service.getJobsByClinic.mockResolvedValue(completedJobs);
      helpers.formatImportResult.mockImplementation(job => ({
        jobId: job.id,
        status: job.status
      }));

      await controller.getImportJobs(req, res);

      expect(service.getJobsByClinic).toHaveBeenCalledWith(1, {
        limit: 10,
        offset: 0,
        status: 'completed'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1
        })
      );
    });

    it('should handle pagination with limit and offset', async () => {
      req.query = { clinicId: '1', limit: '5', offset: '10' };

      service.getJobsByClinic.mockResolvedValue([]);
      helpers.formatImportResult.mockReturnValue({});

      await controller.getImportJobs(req, res);

      expect(service.getJobsByClinic).toHaveBeenCalledWith(1, {
        limit: 5,
        offset: 10,
        status: undefined
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid clinicId', async () => {
      req.query = { clinicId: 'invalid' };

      await controller.getImportJobs(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Get Import Stats', () => {
    it('should return import job statistics', async () => {
      req.params = { jobId: '1' };

      service.getJobStats.mockResolvedValue({
        totalRows: 100,
        successCount: 95,
        failureCount: 5,
        successRate: '95.00',
        status: 'completed',
        errorCount: 5
      });

      await controller.getImportStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            successRate: '95.00',
            totalRows: 100
          })
        })
      );
    });

    it('should calculate success rate correctly in stats', async () => {
      req.params = { jobId: '1' };

      service.getJobStats.mockResolvedValue({
        totalRows: 50,
        successCount: 40,
        failureCount: 10,
        successRate: '80.00',
        status: 'completed'
      });

      await controller.getImportStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            successRate: '80.00'
          })
        })
      );
    });

    it('should return 400 when jobId is missing', async () => {
      req.params = {};

      await controller.getImportStats(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when job not found', async () => {
      req.params = { jobId: '999' };

      service.getJobStats.mockRejectedValue(
        new Error('Import job not found')
      );

      await controller.getImportStats(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Delete Import', () => {
    it('should delete import job successfully', async () => {
      req.params = { jobId: '1' };
      req.query = { clinicId: '1' };

      service.deleteJob.mockResolvedValue({ success: true });

      await controller.deleteImport(req, res);

      expect(service.deleteJob).toHaveBeenCalledWith('1', '1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it('should return 400 when jobId is missing', async () => {
      req.params = {};
      req.query = { clinicId: '1' };

      await controller.deleteImport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('required')
        })
      );
    });

    it('should return 400 when clinicId is missing', async () => {
      req.params = { jobId: '1' };
      req.query = {};

      await controller.deleteImport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('required')
        })
      );
    });

    it('should return 404 when job not found', async () => {
      req.params = { jobId: '999' };
      req.query = { clinicId: '1' };

      service.deleteJob.mockRejectedValue(
        new Error('Import job not found')
      );

      await controller.deleteImport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Business Logic', () => {
    it('should track total rows during import', async () => {
      req.body = { clinicId: 1 };
      req.file = {
        originalname: 'patients.csv',
        mimetype: 'text/csv',
        size: 2048,
        buffer: Buffer.from('name,email\nJohn,j@test.com\nJane,ja@test.com')
      };

      const mockJob = {
        id: 1,
        fileName: 'patients.csv',
        totalRows: 2,
        successCount: 2,
        failureCount: 0,
        status: 'completed',
        completedAt: new Date(),
        errorLog: []
      };

      service.createImportJob.mockResolvedValue({ id: 1 });
      service.updateJobStatus.mockResolvedValue({});
      service.importPatients.mockResolvedValue({
        success: [{ row: 2 }, { row: 3 }],
        failures: []
      });
      service.getJobById.mockResolvedValue(mockJob);
      helpers.formatImportResult.mockReturnValue({
        jobId: 1,
        totalRows: 2
      });

      await controller.createImport(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalRows: 2 })
        })
      );
    });

    it('should track success and failure counts', async () => {
      req.params = { jobId: '1' };

      service.getJobStats.mockResolvedValue({
        totalRows: 100,
        successCount: 85,
        failureCount: 15,
        successRate: '85.00',
        errorCount: 15
      });

      await controller.getImportStats(req, res);

      const stats = res.json.mock.calls[0][0].data;
      expect(stats.successCount + stats.failureCount).toBe(100);
    });

    it('should enforce clinic isolation during import', async () => {
      req.body = { clinicId: 1 };
      req.file = {
        originalname: 'patients.csv',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.from('name,email\nJohn,j@test.com')
      };

      service.createImportJob.mockResolvedValue({ id: 1 });
      service.updateJobStatus.mockResolvedValue({});
      service.importPatients.mockResolvedValue({
        success: [],
        failures: []
      });

      await controller.createImport(req, res);

      // Clinic ID should be passed to service
      expect(service.createImportJob).toHaveBeenCalledWith(
        1, // clinicId
        expect.any(Number),
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should handle import job lifecycle transitions', async () => {
      req.body = { clinicId: 1 };
      req.file = {
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.from('name\nTest')
      };

      service.createImportJob.mockResolvedValue({ id: 1, status: 'pending' });
      service.updateJobStatus.mockResolvedValue({ id: 1, status: 'processing' });
      service.importPatients.mockResolvedValue({ success: [], failures: [] });
      service.getJobById.mockResolvedValue({
        id: 1,
        status: 'completed',
        successCount: 0,
        totalRows: 1,
        completedAt: new Date(),
        errorLog: []
      });
      helpers.formatImportResult.mockReturnValue({
        jobId: 1,
        status: 'completed'
      });

      await controller.createImport(req, res);

      // Should transition: pending → processing → completed
      expect(service.updateJobStatus).toHaveBeenCalledWith(1, 'processing');
    });

    it('should preserve error log for failed imports', async () => {
      req.params = { jobId: '1' };

      const errorLog = [
        { row: 5, error: 'Invalid email format' },
        { row: 8, error: 'Duplicate phone number' }
      ];

      service.getJobStats.mockResolvedValue({
        totalRows: 100,
        successCount: 98,
        failureCount: 2,
        successRate: '98.00',
        errorCount: errorLog.length
      });

      await controller.getImportStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errorCount: 2
          })
        })
      );
    });

    it('should support batch patient creation within import', async () => {
      req.body = { clinicId: 1 };
      req.file = {
        originalname: 'large_batch.csv',
        mimetype: 'text/csv',
        size: 10 * 1024,
        buffer: Buffer.from('name\nPatient1\nPatient2\nPatient3')
      };

      service.createImportJob.mockResolvedValue({ id: 1 });
      service.updateJobStatus.mockResolvedValue({});
      service.importPatients.mockResolvedValue({
        success: [
          { row: 2, patientId: 1 },
          { row: 3, patientId: 2 },
          { row: 4, patientId: 3 }
        ],
        failures: []
      });
      service.getJobById.mockResolvedValue({
        id: 1,
        totalRows: 3,
        successCount: 3,
        failureCount: 0,
        status: 'completed',
        completedAt: new Date(),
        errorLog: []
      });
      helpers.formatImportResult.mockReturnValue({
        jobId: 1,
        successCount: 3,
        totalRows: 3
      });

      await controller.createImport(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            successCount: 3
          })
        })
      );
    });
  });
});
