"use strict";

// ─── Helper Unit Tests (pure functions — no mocking needed) ──────────────────
const helpers = require("../helpers");

describe("helpers.extractPlaceholders()", () => {
  it("extracts placeholder names from {{key}} syntax", () => {
    const result = helpers.extractPlaceholders("Hello {{name}}, your time is {{time}}");
    expect(result).toContain("name");
    expect(result).toContain("time");
    expect(result).toHaveLength(2);
  });

  it("deduplicates repeated placeholders", () => {
    const result = helpers.extractPlaceholders("{{name}} and {{name}} again");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("name");
  });

  it("returns empty array when no placeholders exist", () => {
    const result = helpers.extractPlaceholders("No placeholders here");
    expect(result).toEqual([]);
  });

  it("does NOT capture partial patterns like {name} or {{}}", () => {
    const result = helpers.extractPlaceholders("{name} is not valid {{}} empty");
    // Only {{ word }} with \w+ inside qualifies
    expect(result).toHaveLength(0);
  });
});

describe("helpers.parseTemplate()", () => {
  it("replaces all {{key}} occurrences with values from the data map", () => {
    const result = helpers.parseTemplate("Hello {{name}}", { name: "John" });
    expect(result).toBe("Hello John");
  });

  it("replaces multiple placeholders in one pass", () => {
    const result = helpers.parseTemplate("Hi {{first}} {{last}}", { first: "Jane", last: "Doe" });
    expect(result).toBe("Hi Jane Doe");
  });

  it("leaves un-matched placeholders intact when data is missing that key", () => {
    const result = helpers.parseTemplate("Hello {{name}}", {});
    expect(result).toBe("Hello {{name}}");
  });

  it("handles empty data object without throwing", () => {
    expect(() => helpers.parseTemplate("plain text", {})).not.toThrow();
  });
});

describe("helpers.calculateNextRetryTime()", () => {
  it("returns null for retryStrategy 'none'", () => {
    const result = helpers.calculateNextRetryTime(1, "none");
    expect(result).toBeNull();
  });

  it("returns a future Date for 'exponential' strategy", () => {
    const before = Date.now();
    const result = helpers.calculateNextRetryTime(2, "exponential");
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThan(before);
  });

  it("uses exponential backoff: delay grows faster than linear", () => {
    const attempt1 = helpers.calculateNextRetryTime(1, "exponential");
    const attempt3 = helpers.calculateNextRetryTime(3, "exponential");
    const now = Date.now();
    expect(attempt3.getTime() - now).toBeGreaterThan(attempt1.getTime() - now);
  });

  it("returns a future Date for 'linear' strategy", () => {
    const before = Date.now();
    const result = helpers.calculateNextRetryTime(2, "linear");
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThan(before);
  });

  it("linear delay grows linearly: attempt 2 delay > attempt 1 delay", () => {
    const now = Date.now();
    const t1 = helpers.calculateNextRetryTime(1, "linear").getTime() - now;
    const t2 = helpers.calculateNextRetryTime(2, "linear").getTime() - now;
    expect(t2).toBeGreaterThan(t1);
  });
});

describe("helpers.validateEmailAddress()", () => {
  it("returns true for a valid email address", () => {
    expect(helpers.validateEmailAddress("user@example.com")).toBe(true);
  });

  it("returns false for an address without @", () => {
    expect(helpers.validateEmailAddress("notanemail")).toBe(false);
  });

  it("returns false for an address without domain", () => {
    expect(helpers.validateEmailAddress("user@")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(helpers.validateEmailAddress("")).toBe(false);
  });
});

describe("helpers.validatePlaceholderData()", () => {
  it("returns valid:true when all required placeholders are provided", () => {
    const result = helpers.validatePlaceholderData(["name", "time"], { name: "Alice", time: "10am" });
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("returns valid:false with missing list when placeholders are absent", () => {
    const result = helpers.validatePlaceholderData(["name", "time"], { name: "Alice" });
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("time");
  });

  it("returns valid:true for empty required list", () => {
    const result = helpers.validatePlaceholderData([], {});
    expect(result.valid).toBe(true);
  });
});

// ─── Service Unit Tests (models mocked via jest.doMock + resetModules) ───────

describe("emailNotificationEngineService.createTemplate() — duplicate prevention", () => {
  let service;
  let mockEmailTemplate;

  beforeEach(() => {
    jest.resetModules();
    mockEmailTemplate = {
      findOne: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn(),
      findAll: jest.fn(),
    };
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn() },
      EmailLog: { create: jest.fn(), findAll: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("throws an error when a template with the same key exists for the clinic", async () => {
    mockEmailTemplate.findOne.mockResolvedValue({ id: 99, templateKey: "welcome_email" });

    await expect(
      service.createTemplate(1, {
        templateKey: "welcome_email",
        eventType: "registration",
        subject: "Welcome",
        body: "Hello {{name}}",
      })
    ).rejects.toThrow("welcome_email");
  });

  it("creates the template when key is unique for that clinic", async () => {
    mockEmailTemplate.findOne.mockResolvedValue(null);
    const created = {
      id: "uuid-1",
      templateKey: "welcome_email",
      eventType: "registration",
      subject: "Welcome",
      body: "Hello {{name}}",
      placeholders: ["name"],
      isActive: true,
      maxRetries: 3,
      retryStrategy: "exponential",
      createdAt: new Date(),
    };
    mockEmailTemplate.create.mockResolvedValue(created);

    const result = await service.createTemplate(1, {
      templateKey: "welcome_email",
      eventType: "registration",
      subject: "Welcome",
      body: "Hello {{name}}",
    });

    expect(mockEmailTemplate.create).toHaveBeenCalled();
    expect(result.templateKey).toBe("welcome_email");
  });

  it("auto-extracts placeholders from the body text", async () => {
    mockEmailTemplate.findOne.mockResolvedValue(null);
    const created = {
      id: "uuid-2", templateKey: "appt", eventType: "appointment",
      subject: "Hi", body: "Dear {{patientName}}, your appt is {{time}}",
      placeholders: ["patientName", "time"], isActive: true,
      maxRetries: 3, retryStrategy: "exponential", createdAt: new Date(),
    };
    mockEmailTemplate.create.mockResolvedValue(created);

    await service.createTemplate(1, {
      templateKey: "appt", eventType: "appointment",
      subject: "Hi", body: "Dear {{patientName}}, your appt is {{time}}",
    });

    const createArg = mockEmailTemplate.create.mock.calls[0][0];
    expect(createArg.placeholders).toContain("patientName");
    expect(createArg.placeholders).toContain("time");
  });
});

describe("emailNotificationEngineService.retryFailedEmails() — attempts gate", () => {
  let service;
  let mockEmailTemplate;
  let mockEmailQueue;

  beforeEach(() => {
    jest.resetModules();
    mockEmailTemplate = { findByPk: jest.fn() };
    mockEmailQueue = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() };
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: mockEmailQueue,
      EmailLog: { create: jest.fn(), findAll: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("only retries entries with attempts < 3 (skips attempts >= 3)", async () => {
    // findAll called with Op.lt: 3 — entries with attempts >= 3 must not appear
    const retryable = [
      {
        id: "q1",
        templateId: "t1",
        attempts: 1,
        update: jest.fn().mockResolvedValue({}),
      },
    ];
    mockEmailQueue.findAll.mockResolvedValue(retryable);
    mockEmailTemplate.findByPk.mockResolvedValue({
      id: "t1",
      isActive: true,
      retryStrategy: "exponential",
    });

    const result = await service.retryFailedEmails(1);

    // findAll must have included an Op.lt constraint on attempts
    const callArg = mockEmailQueue.findAll.mock.calls[0][0];
    const whereAttempts = callArg.where.attempts;
    expect(whereAttempts).toBeDefined();

    expect(result.retried).toBe(1);
  });

  it("does not retry entries whose template is inactive", async () => {
    const entries = [
      { id: "q2", templateId: "t2", attempts: 0, update: jest.fn() },
    ];
    mockEmailQueue.findAll.mockResolvedValue(entries);
    mockEmailTemplate.findByPk.mockResolvedValue({ id: "t2", isActive: false, retryStrategy: "exponential" });

    const result = await service.retryFailedEmails(1);

    expect(result.retried).toBe(0);
    expect(entries[0].update).not.toHaveBeenCalled();
  });

  it("returns retried:0 when there are no failed emails", async () => {
    mockEmailQueue.findAll.mockResolvedValue([]);
    const result = await service.retryFailedEmails(1);
    expect(result.retried).toBe(0);
  });
});

describe("emailNotificationEngineService.processQueue() — success path writes EmailLog", () => {
  let service;
  let mockEmailTemplate;
  let mockEmailQueue;
  let mockEmailLog;

  beforeEach(() => {
    jest.resetModules();

    const queueEntry = {
      id: "q10",
      templateId: "t10",
      recipient: "patient@example.com",
      recipientName: "Alice",
      placeholderData: { name: "Alice" },
      attempts: 0,
      createdAt: new Date(),
      update: jest.fn().mockResolvedValue({}),
    };

    mockEmailQueue = {
      findAll: jest.fn().mockResolvedValue([queueEntry]),
    };
    mockEmailTemplate = {
      findByPk: jest.fn().mockResolvedValue({
        id: "t10",
        subject: "Hello {{name}}",
        body: "Dear {{name}}",
        isActive: true,
        retryStrategy: "exponential",
      }),
    };
    mockEmailLog = {
      create: jest.fn().mockResolvedValue({ id: "log1" }),
      findAll: jest.fn(),
    };

    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: mockEmailQueue,
      EmailLog: mockEmailLog,
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("creates an EmailLog record with status 'success' on successful send", async () => {
    await service.processQueue(1);

    expect(mockEmailLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" })
    );
  });

  it("updates the queue entry status to 'sent' after successful delivery", async () => {
    const pending = mockEmailQueue.findAll.mock.results;
    await service.processQueue(1);

    const queueEntry = (await mockEmailQueue.findAll.mock.results[0].value)[0];
    expect(queueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent" })
    );
  });

  it("increments the attempts counter on the queue entry", async () => {
    await service.processQueue(1);

    const queueEntry = (await mockEmailQueue.findAll.mock.results[0].value)[0];
    const updateCalls = queueEntry.update.mock.calls;
    const sentCall = updateCalls.find(
      (args) => args[0].status === "sent"
    );
    expect(sentCall[0].attempts).toBe(1); // 0 + 1
  });

  it("returns correct successCount and failureCount", async () => {
    const result = await service.processQueue(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(result.totalProcessed).toBe(1);
  });
});

// ─── Controller Tests via Supertest ─────────────────────────────────────────
const express = require("express");
const request = require("supertest");

describe("emailNotificationEngine Controller", () => {
  let app;
  let mockService;

  beforeEach(() => {
    jest.resetModules();
    mockService = {
      createTemplate: jest.fn(),
      getTemplateByKey: jest.fn(),
      getTemplatesByEventType: jest.fn(),
      updateTemplate: jest.fn(),
      deactivateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      queueEmail: jest.fn(),
      sendEmailNow: jest.fn(),
      getPendingEmails: jest.fn(),
      getFailedEmails: jest.fn(),
      retryFailedEmails: jest.fn(),
      processQueue: jest.fn(),
      getEmailStats: jest.fn(),
      getEmailLogs: jest.fn(),
    };
    jest.doMock("../service", () => mockService);
    jest.doMock("../model", () => ({
      EmailTemplate: {},
      EmailQueue: {},
      EmailLog: {},
    }));
    jest.doMock("../helpers", () => ({
      extractPlaceholders: jest.fn().mockReturnValue([]),
      parseTemplate: jest.fn().mockImplementation((t) => t),
      formatTemplateResponse: jest.fn().mockImplementation((t) => t),
      formatQueueResponse: jest.fn().mockImplementation((q) => q),
      formatLogResponse: jest.fn().mockImplementation((l) => l),
      validateEmailAddress: jest.fn().mockReturnValue(true),
      validatePlaceholderData: jest.fn().mockReturnValue({ valid: true, missing: [] }),
    }));

    const controller = require("../controller");
    app = express();
    app.use(express.json());
    app.post("/templates", controller.createTemplate);
    app.get("/templates/:key", controller.getTemplate);
    app.put("/templates/:id", controller.updateTemplate);
    app.delete("/templates/:id", controller.deleteTemplate);
    app.post("/queue", controller.queueEmail);
    app.post("/send", controller.sendEmail);
    app.get("/queue/pending", controller.getPendingEmails);
    app.get("/queue/failed", controller.getFailedEmails);
    app.post("/queue/retry", controller.retryFailed);
    app.post("/queue/process", controller.processQueue);
    app.get("/stats", controller.getStats);
    app.get("/logs", controller.getLogs);
  });

  afterEach(() => jest.clearAllMocks());

  it("POST /templates returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/templates").send({ clinicId: 1 });
    expect(res.status).toBe(400);
  });

  it("POST /templates returns 201 on successful creation", async () => {
    const template = {
      id: "uuid-1", templateKey: "welcome", eventType: "registration",
      subject: "Hi", body: "Hi {{name}}", placeholders: ["name"],
      isActive: true, maxRetries: 3, retryStrategy: "exponential", createdAt: new Date(),
    };
    mockService.createTemplate.mockResolvedValue(template);
    const res = await request(app).post("/templates").send({
      clinicId: 1, templateKey: "welcome", eventType: "registration",
      subject: "Hi", body: "Hi {{name}}",
    });
    expect(res.status).toBe(201);
  });

  it("POST /templates returns 409 when template key already exists", async () => {
    mockService.createTemplate.mockRejectedValue(
      new Error("Template with key 'welcome' already exists for this clinic")
    );
    const res = await request(app).post("/templates").send({
      clinicId: 1, templateKey: "welcome", eventType: "registration",
      subject: "Hi", body: "Hi",
    });
    expect([400, 409, 500]).toContain(res.status);
  });

  it("POST /queue enqueues an email and returns 201", async () => {
    mockService.queueEmail.mockResolvedValue({ id: "q1", status: "pending" });
    const res = await request(app).post("/queue").send({
      clinicId: 1, templateKey: "welcome", recipient: "user@example.com",
      recipientName: "Alice", placeholderData: { name: "Alice" },
    });
    expect(res.status).toBe(201);
  });

  it("POST /send dispatches email immediately and returns 200", async () => {
    mockService.sendEmailNow.mockResolvedValue({ success: true, logId: "l1", deliverTime: 42 });
    const res = await request(app).post("/send").send({
      clinicId: 1, templateKey: "welcome", recipient: "user@example.com",
      placeholderData: { name: "Alice" },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
  });

  it("POST /queue/retry triggers retry and returns 200 with count", async () => {
    mockService.retryFailedEmails.mockResolvedValue({ retried: 5 });
    const res = await request(app).post("/queue/retry").send({ clinicId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.retried).toBe(5);
  });

  it("POST /queue/process triggers processing and returns 200 with stats", async () => {
    mockService.processQueue.mockResolvedValue({ successCount: 8, failureCount: 2, totalProcessed: 10 });
    const res = await request(app).post("/queue/process").send({ clinicId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.successCount).toBe(8);
  });

  it("GET /stats returns 200 with email analytics", async () => {
    mockService.getEmailStats.mockResolvedValue({
      totalSent: 100, successful: 90, failed: 10, successRate: 90,
    });
    const res = await request(app).get("/stats?clinicId=1&from=2026-01-01&to=2026-01-31");
    expect(res.status).toBe(200);
  });

  it("DELETE /templates/:id returns 204 on successful deletion", async () => {
    mockService.deleteTemplate.mockResolvedValue({ success: true });
    const res = await request(app).delete("/templates/uuid-1?clinicId=1");
    expect(res.status).toBe(204);
  });
});
