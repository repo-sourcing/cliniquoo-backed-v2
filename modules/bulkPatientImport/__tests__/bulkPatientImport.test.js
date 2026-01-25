"use strict";

// ─── Helper Unit Tests (pure functions, no mocking) ─────────────────────────
const helpers = require("../helpers");

describe("helpers.validatePatientRow()", () => {
  it("returns isValid:true for a row with a valid name", () => {
    const result = helpers.validatePatientRow({ name: "John Doe" });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns isValid:false and errors when name is missing", () => {
    const result = helpers.validatePatientRow({ name: "" });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("name is required");
  });

  it("catches invalid email format", () => {
    const result = helpers.validatePatientRow({ name: "Jane", email: "not-an-email" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("email"))).toBe(true);
  });

  it("accepts valid email format", () => {
    const result = helpers.validatePatientRow({ name: "Jane", email: "jane@example.com" });
    expect(result.isValid).toBe(true);
  });

  it("catches invalid gender values", () => {
    const result = helpers.validatePatientRow({ name: "Sam", gender: "X" });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("gender"))).toBe(true);
  });

  it("accepts valid gender values M, F, O", () => {
    ["M", "F", "O"].forEach((g) => {
      const result = helpers.validatePatientRow({ name: "Sam", gender: g });
      expect(result.isValid).toBe(true);
    });
  });

  it("catches invalid dateOfBirth", () => {
    const result = helpers.validatePatientRow({ name: "Sam", dateOfBirth: "not-a-date" });
    expect(result.isValid).toBe(false);
  });

  it("accepts valid ISO dateOfBirth", () => {
    const result = helpers.validatePatientRow({ name: "Sam", dateOfBirth: "1990-05-15" });
    expect(result.isValid).toBe(true);
  });
});

describe("helpers.transformPatientData()", () => {
  it("sets clinicId on the returned object", () => {
    const result = helpers.transformPatientData({ name: " Alice " }, 42);
    expect(result.clinicId).toBe(42);
  });

  it("trims whitespace from name", () => {
    const result = helpers.transformPatientData({ name: "  Bob  " }, 1);
    expect(result.name).toBe("Bob");
  });

  it("uppercases gender value", () => {
    const result = helpers.transformPatientData({ name: "Sam", gender: "m" }, 1);
    expect(result.gender).toBe("M");
  });

  it("rejects gender values not matching M|F|O and returns null", () => {
    const result = helpers.transformPatientData({ name: "Sam", gender: "X" }, 1);
    expect(result.gender).toBeNull();
  });

  it("converts dateOfBirth string to Date object", () => {
    const result = helpers.transformPatientData({ name: "Ann", dateOfBirth: "1985-03-10" }, 1);
    expect(result.dateOfBirth).toBeInstanceOf(Date);
  });

  it("returns null for empty optional string fields", () => {
    const result = helpers.transformPatientData({ name: "Ann", email: "" }, 1);
    expect(result.email).toBeNull();
  });
});

describe("helpers.calculateSuccessRate()", () => {
  it("returns 0 when totalRows is 0 (no division by zero)", () => {
    expect(helpers.calculateSuccessRate(0, 0)).toBe(0);
  });

  it("returns 100.00 when all rows succeeded", () => {
    expect(helpers.calculateSuccessRate(10, 10)).toBe("100.00");
  });

  it("returns correct percentage as a string with 2 decimals", () => {
    expect(helpers.calculateSuccessRate(5, 10)).toBe("50.00");
    expect(helpers.calculateSuccessRate(1, 3)).toBe("33.33");
  });
});

describe("helpers.chunkArray()", () => {
  it("splits array into correct chunk sizes", () => {
    const result = helpers.chunkArray([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk when array is smaller than chunk size", () => {
    const result = helpers.chunkArray([1, 2], 10);
    expect(result).toEqual([[1, 2]]);
  });

  it("returns empty array for empty input", () => {
    expect(helpers.chunkArray([], 5)).toEqual([]);
  });
});

describe("helpers.parseCSV()", () => {
  it("parses valid CSV string into array of objects", async () => {
    const csv = "name,email\nAlice,alice@example.com\nBob,bob@example.com";
    const result = await helpers.parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].email).toBe("bob@example.com");
  });

  it("throws an error when CSV data is empty", async () => {
    await expect(helpers.parseCSV("")).rejects.toThrow();
  });

  it("handles CSV with extra whitespace by trimming", async () => {
    const csv = "name,email\n  Alice  , alice@example.com ";
    const result = await helpers.parseCSV(csv);
    expect(result[0].name).toBe("Alice");
  });
});

// ─── Service Unit Tests (db mocked via jest.doMock + resetModules) ──────────
describe("bulkPatientImportService.getJobById() — clinic isolation", () => {
  let service;
  let mockImportJob;

  beforeEach(() => {
    jest.resetModules();
    mockImportJob = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };
    const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    jest.doMock("../../config/db", () => ({
      models: {
        ImportJob: mockImportJob,
        Patient: { create: jest.fn(), findOne: jest.fn() },
      },
      sequelize: {
        transaction: jest.fn().mockResolvedValue(mockTransaction),
      },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("returns the job when clinicId matches", async () => {
    const fakeJob = { id: 1, clinicId: 5, status: "completed" };
    mockImportJob.findOne.mockResolvedValue(fakeJob);

    const result = await service.getJobById(1, 5);

    expect(mockImportJob.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, clinicId: 5 } })
    );
    expect(result).toEqual(fakeJob);
  });

  it("throws 'not found' when job belongs to a different clinic", async () => {
    mockImportJob.findOne.mockResolvedValue(null);
    await expect(service.getJobById(1, 99)).rejects.toThrow("not found");
  });
});

describe("bulkPatientImportService.importPatients() — transaction usage", () => {
  let service;
  let mockImportJob;
  let mockPatient;
  let mockTransaction;
  let mockSequelize;

  beforeEach(() => {
    jest.resetModules();
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    mockSequelize = { transaction: jest.fn().mockResolvedValue(mockTransaction) };

    const jobInstance = {
      id: 1,
      totalRows: 0,
      successCount: 0,
      failureCount: 0,
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };

    mockImportJob = {
      create: jest.fn().mockResolvedValue(jobInstance),
      findByPk: jest.fn().mockResolvedValue(jobInstance),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };
    mockPatient = {
      create: jest.fn().mockResolvedValue({ id: 100, name: "Test" }),
      findOne: jest.fn().mockResolvedValue(null),
    };

    jest.doMock("../../config/db", () => ({
      models: { ImportJob: mockImportJob, Patient: mockPatient },
      sequelize: mockSequelize,
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls sequelize.transaction() to wrap the import operation", async () => {
    const csvData = "name,phone\nAlice,1234567890";
    await service.importPatients(1, csvData, 5);
    expect(mockSequelize.transaction).toHaveBeenCalledTimes(1);
  });

  it("commits the transaction on successful import", async () => {
    const csvData = "name,phone\nAlice,1234567890";
    await service.importPatients(1, csvData, 5);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
  });

  it("calls Patient.create for each valid CSV row with the given clinicId", async () => {
    const csvData = "name,phone\nAlice,1234567890\nBob,9876543210";
    await service.importPatients(1, csvData, 5);
    expect(mockPatient.create).toHaveBeenCalledTimes(2);
    expect(mockPatient.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice", clinicId: 5 }),
      expect.objectContaining({ transaction: mockTransaction })
    );
  });

  it("calls Patient.findOne to check for existing patients before creating", async () => {
    const csvData = "name,phone\nAlice,1234567890";
    await service.importPatients(1, csvData, 5);
    expect(mockPatient.findOne).toHaveBeenCalled();
    expect(mockPatient.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clinicId: 5 }) })
    );
  });

  it("rolls back transaction when the import job is not found", async () => {
    mockImportJob.findByPk.mockResolvedValueOnce(null);
    const csvData = "name,phone\nAlice,1234567890";
    await service.importPatients(99, csvData, 5).catch(() => {});
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    expect(mockTransaction.commit).not.toHaveBeenCalled();
  });

  it("skips duplicate patient when Patient.findOne returns existing record and does not call Patient.create for that row", async () => {
    // first row is a duplicate, second row is new
    mockPatient.findOne
      .mockResolvedValueOnce({ id: 99, name: "Existing" }) // duplicate → skipped
      .mockResolvedValueOnce(null);                         // new → created
    const csvData = "name,phone\nAlice,1234567890\nBob,9876543210";
    const result = await service.importPatients(1, csvData, 5);
    // Only Bob should be created
    expect(mockPatient.create).toHaveBeenCalledTimes(1);
    expect(mockPatient.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bob" }),
      expect.any(Object)
    );
    // Alice ends up in failures (duplicate error)
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].error).toMatch(/already exists/);
  });
});

describe("bulkPatientImportService.getJobStats()", () => {
  let service;
  let mockImportJob;

  beforeEach(() => {
    jest.resetModules();
    mockImportJob = {
      findByPk: jest.fn(),
    };
    jest.doMock("../../config/db", () => ({
      models: { ImportJob: mockImportJob, Patient: {} },
      sequelize: { transaction: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calculates successRate as a percentage string", async () => {
    mockImportJob.findByPk.mockResolvedValue({
      id: 1, totalRows: 10, successCount: 8, failureCount: 2,
      status: "completed", errorLog: [],
    });

    const stats = await service.getJobStats(1);

    expect(stats.successRate).toBe("80.00");
    expect(stats.totalRows).toBe(10);
    expect(stats.successCount).toBe(8);
  });

  it("returns successRate of 0 when totalRows is 0", async () => {
    mockImportJob.findByPk.mockResolvedValue({
      id: 1, totalRows: 0, successCount: 0, failureCount: 0,
      status: "pending", errorLog: [],
    });

    const stats = await service.getJobStats(1);

    expect(stats.successRate).toBe(0);
  });
});

// ─── Service Unit Tests — updateJobStatus / getJobsByClinic / deleteJob ──────

describe("bulkPatientImportService.updateJobStatus()", () => {
  let service;
  let mockImportJob;
  let jobInstance;

  beforeEach(() => {
    jest.resetModules();
    jobInstance = { id: 1, status: "pending", update: jest.fn().mockResolvedValue({}) };
    mockImportJob = { findByPk: jest.fn().mockResolvedValue(jobInstance) };
    jest.doMock("../../config/db", () => ({
      models: { ImportJob: mockImportJob, Patient: {} },
      sequelize: { transaction: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls job.update with the provided status", async () => {
    await service.updateJobStatus(1, "processing");
    expect(mockImportJob.findByPk).toHaveBeenCalledWith(1);
    expect(jobInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" })
    );
  });

  it("throws when job is not found", async () => {
    mockImportJob.findByPk.mockResolvedValue(null);
    await expect(service.updateJobStatus(999, "completed")).rejects.toThrow(/not found/);
  });
});

describe("bulkPatientImportService.getJobsByClinic()", () => {
  let service;
  let mockImportJob;

  beforeEach(() => {
    jest.resetModules();
    mockImportJob = {
      findAll: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    };
    jest.doMock("../../config/db", () => ({
      models: { ImportJob: mockImportJob, Patient: {} },
      sequelize: { transaction: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("queries ImportJob with the given clinicId and returns list", async () => {
    const jobs = await service.getJobsByClinic(7);
    expect(mockImportJob.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clinicId: 7 }) })
    );
    expect(jobs).toHaveLength(2);
  });

  it("includes status filter in query when status option is provided", async () => {
    await service.getJobsByClinic(7, { status: "completed" });
    expect(mockImportJob.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clinicId: 7, status: "completed" }) })
    );
  });
});

describe("bulkPatientImportService.deleteJob()", () => {
  let service;
  let mockImportJob;
  let jobInstance;

  beforeEach(() => {
    jest.resetModules();
    jobInstance = { id: 5, destroy: jest.fn().mockResolvedValue({}) };
    mockImportJob = { findOne: jest.fn().mockResolvedValue(jobInstance) };
    jest.doMock("../../config/db", () => ({
      models: { ImportJob: mockImportJob, Patient: {} },
      sequelize: { transaction: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("finds job by jobId+clinicId then calls destroy(), returning { success: true }", async () => {
    const result = await service.deleteJob(5, 3);
    expect(mockImportJob.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 5, clinicId: 3 }) })
    );
    expect(jobInstance.destroy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  it("throws when the job is not found", async () => {
    mockImportJob.findOne.mockResolvedValue(null);
    await expect(service.deleteJob(999, 3)).rejects.toThrow(/not found/);
  });
});

// ─── Controller Tests via Supertest ─────────────────────────────────────────
const express = require("express");
const request = require("supertest");
const multer = require("multer");

describe("bulkPatientImport Controller", () => {
  let app;
  let mockService;

  beforeEach(() => {
    jest.resetModules();
    mockService = {
      createImportJob: jest.fn(),
      updateJobStatus: jest.fn(),
      importPatients: jest.fn(),
      getJobById: jest.fn(),
      getJobsByClinic: jest.fn(),
      getJobStats: jest.fn(),
      deleteJob: jest.fn(),
    };
    jest.doMock("../service", () => mockService);
    jest.doMock("../helpers", () => ({
      validatePatientRow: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      formatImportResult: jest.fn().mockImplementation((job) => ({
        jobId: job.id,
        status: job.status,
        totalRows: job.totalRows || 0,
        successCount: job.successCount || 0,
        failureCount: job.failureCount || 0,
        successRate: "0",
      })),
    }));
    jest.doMock("../../config/db", () => ({
      models: { ImportJob: {}, Patient: {} },
      sequelize: { transaction: jest.fn() },
    }));

    const upload = multer({ storage: multer.memoryStorage() });
    const controller = require("../controller");
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 1 };
      next();
    });
    app.post("/bulkImport", upload.single("file"), controller.createImport);
    app.get("/bulkImport/:jobId", controller.getImportJob);
    app.get("/bulkImport", controller.getImportJobs);
    app.get("/bulkImport/:jobId/stats", controller.getImportStats);
    app.delete("/bulkImport/:jobId", controller.deleteImport);
  });

  afterEach(() => jest.clearAllMocks());

  it("POST / returns 400 when file is missing", async () => {
    const res = await request(app).post("/bulkImport").field("clinicId", "1");
    expect(res.status).toBe(400);
  });

  it("POST / returns 400 for non-CSV file type", async () => {
    const res = await request(app)
      .post("/bulkImport")
      .field("clinicId", "1")
      .attach("file", Buffer.from("data"), { filename: "data.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });

  it("POST / creates an import job and returns 201", async () => {
    const jobRecord = { id: 5, status: "completed", totalRows: 2, successCount: 2, failureCount: 0 };
    mockService.createImportJob.mockResolvedValue(jobRecord);
    mockService.updateJobStatus.mockResolvedValue(jobRecord);
    mockService.importPatients.mockResolvedValue({ success: [], failures: [] });
    mockService.getJobById.mockResolvedValue(jobRecord);

    const csvContent = "name,email\nAlice,a@b.com\nBob,b@c.com";
    const res = await request(app)
      .post("/bulkImport")
      .field("clinicId", "1")
      .attach("file", Buffer.from(csvContent), { filename: "patients.csv", contentType: "text/csv" });

    expect(res.status).toBe(201);
    expect(mockService.createImportJob).toHaveBeenCalledWith(1, 1, "patients.csv", expect.any(Number));
  });

  it("GET /:jobId returns 200 with job data", async () => {
    const job = { id: 3, status: "completed", totalRows: 5, successCount: 4, failureCount: 1 };
    mockService.getJobById.mockResolvedValue(job);
    const res = await request(app).get("/bulkImport/3?clinicId=1");
    expect(res.status).toBe(200);
    expect(mockService.getJobById).toHaveBeenCalledWith(3, 1);
  });

  it("GET /:jobId returns 404 when job not found", async () => {
    mockService.getJobById.mockRejectedValue(new Error("Import job not found"));
    const res = await request(app).get("/bulkImport/999?clinicId=1");
    expect(res.status).toBe(404);
  });

  it("GET / returns 200 with list of jobs", async () => {
    mockService.getJobsByClinic.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await request(app).get("/bulkImport?clinicId=1");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it("GET /:jobId/stats returns 200 with stats", async () => {
    mockService.getJobStats.mockResolvedValue({
      totalRows: 10,
      successCount: 8,
      failureCount: 2,
      successRate: "80.00",
      status: "completed",
    });
    const res = await request(app).get("/bulkImport/1/stats");
    expect(res.status).toBe(200);
    expect(res.body.data.successRate).toBe("80.00");
  });

  it("DELETE /:jobId returns 204 on success", async () => {
    mockService.deleteJob.mockResolvedValue({ success: true });
    const res = await request(app).delete("/bulkImport/1?clinicId=1");
    expect(res.status).toBe(204);
  });
});
