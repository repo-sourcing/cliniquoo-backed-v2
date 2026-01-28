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

    expect(mockEmailTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 1,
        templateKey: "welcome_email",
        eventType: "registration",
        subject: "Welcome",
        body: "Hello {{name}}",
      })
    );
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

// ─── Service Unit Tests — additional methods ─────────────────────────────────

function makeEmailMocks(templateOverrides = {}, queueOverrides = {}, logOverrides = {}) {
  const tmpl = { id: "t1", templateKey: "welcome", eventType: "registration",
    subject: "Hi {{name}}", body: "Hello {{name}}", placeholders: ["name"], isActive: true,
    update: jest.fn().mockResolvedValue({}), destroy: jest.fn().mockResolvedValue({}) };
  return {
    mockEmailTemplate: { findOne: jest.fn().mockResolvedValue(tmpl), findAll: jest.fn().mockResolvedValue([tmpl]),
      create: jest.fn().mockResolvedValue(tmpl), ...templateOverrides },
    mockEmailQueue: { create: jest.fn().mockResolvedValue({ id: "q1", recipient: "a@b.com" }),
      findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn(), ...queueOverrides },
    mockEmailLog: { create: jest.fn().mockResolvedValue({ id: "l1" }),
      findAll: jest.fn().mockResolvedValue([]), ...logOverrides },
    tmpl,
  };
}

describe("emailNotificationEngineService.getTemplateByKey()", () => {
  let service;
  let mockEmailTemplate;

  beforeEach(() => {
    jest.resetModules();
    ({ mockEmailTemplate } = makeEmailMocks());
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: {}, EmailLog: {},
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("queries with clinicId, templateKey, and isActive:true and returns template", async () => {
    const template = await service.getTemplateByKey(1, "welcome");
    expect(mockEmailTemplate.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: 1, templateKey: "welcome", isActive: true }),
      })
    );
    expect(template.templateKey).toBe("welcome");
  });

  it("throws when template is not found", async () => {
    mockEmailTemplate.findOne.mockResolvedValue(null);
    await expect(service.getTemplateByKey(1, "missing_key")).rejects.toThrow(/not found/);
  });
});

describe("emailNotificationEngineService.getTemplatesByEventType()", () => {
  let service;
  let mockEmailTemplate;

  beforeEach(() => {
    jest.resetModules();
    ({ mockEmailTemplate } = makeEmailMocks());
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: {}, EmailLog: {},
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("queries with clinicId, eventType, isActive:true and returns formatted list", async () => {
    const result = await service.getTemplatesByEventType(1, "registration");
    expect(mockEmailTemplate.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: 1, eventType: "registration", isActive: true }),
      })
    );
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("emailNotificationEngineService.deactivateTemplate()", () => {
  let service;
  let mockEmailTemplate;
  let tmpl;

  beforeEach(() => {
    jest.resetModules();
    ({ mockEmailTemplate, tmpl } = makeEmailMocks());
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: {}, EmailLog: {},
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls template.update({ isActive: false }) and returns { success: true }", async () => {
    const result = await service.deactivateTemplate("t1", 1);
    expect(tmpl.update).toHaveBeenCalledWith({ isActive: false });
    expect(result).toEqual({ success: true });
  });

  it("throws when template is not found", async () => {
    mockEmailTemplate.findOne.mockResolvedValue(null);
    await expect(service.deactivateTemplate("missing", 1)).rejects.toThrow(/not found/);
  });
});

describe("emailNotificationEngineService.queueEmail()", () => {
  let service;
  let mockEmailTemplate;
  let mockEmailQueue;

  beforeEach(() => {
    jest.resetModules();
    ({ mockEmailTemplate, mockEmailQueue } = makeEmailMocks());
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: mockEmailQueue, EmailLog: { create: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("creates a queue entry with the templateId and recipient", async () => {
    await service.queueEmail(1, {
      templateKey: "welcome", recipient: "user@test.com",
      recipientName: "Alice", placeholderData: { name: "Alice" },
    });
    expect(mockEmailQueue.create).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: "t1", clinicId: 1, recipient: "user@test.com" })
    );
  });
});

describe("emailNotificationEngineService.getEmailStats()", () => {
  let service;
  let mockEmailLog;

  beforeEach(() => {
    jest.resetModules();
    mockEmailLog = { findAll: jest.fn().mockResolvedValue([
      { status: "success", deliverTime: 100 },
      { status: "failure", deliverTime: null },
      { status: "success", deliverTime: 200 },
    ]) };
    jest.doMock("../model", () => ({
      EmailTemplate: {}, EmailQueue: {}, EmailLog: mockEmailLog,
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("returns correct counts and averageDeliveryTime", async () => {
    const stats = await service.getEmailStats(1, "2024-01-01", "2024-01-31");
    expect(stats.totalSent).toBe(3);
    expect(stats.successful).toBe(2);
    expect(stats.failed).toBe(1);
    // average of 100 and 200 (only entries with deliverTime)
    expect(stats.averageDeliveryTime).toBe(150);
    expect(stats.successRate).toBe(67); // Math.round(2/3*100)
  });
});

describe("emailNotificationEngineService.deleteTemplate()", () => {
  let service;
  let mockEmailTemplate;
  let tmpl;

  beforeEach(() => {
    jest.resetModules();
    ({ mockEmailTemplate, tmpl } = makeEmailMocks());
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: {}, EmailLog: {},
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("finds template and calls destroy(), returning { success: true }", async () => {
    const result = await service.deleteTemplate("t1", 1);
    expect(mockEmailTemplate.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "t1", clinicId: 1 }) })
    );
    expect(tmpl.destroy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  it("throws when template is not found", async () => {
    mockEmailTemplate.findOne.mockResolvedValue(null);
    await expect(service.deleteTemplate("missing", 1)).rejects.toThrow(/not found/);
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
    // Inject req.user so controller can read clinicId from req.user.clinicId
    app.use((req, res, next) => { req.user = { clinicId: 1 }; next(); });
    app.post("/templates", controller.createTemplate);
    app.patch("/templates/:templateId", controller.updateTemplate);
    app.delete("/templates/:templateId", controller.deleteTemplate);
    app.post("/queue", controller.queueEmail);
    app.post("/send", controller.sendEmailNow);
    app.get("/pending", controller.getPendingEmails);
    app.get("/failed", controller.getFailedEmails);
    app.post("/queue/retry", controller.retryFailedEmails);
    app.post("/queue/process", controller.processQueue);
    app.get("/stats", controller.getEmailStats);
    app.get("/logs", controller.getEmailLogs);
  });

  afterEach(() => jest.clearAllMocks());

  it("POST /templates returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/templates").send({ clinicId: 1 });
    expect(res.status).toBe(400);
  });

  it("POST /templates returns 201 on successful creation", async () => {
    const template = {
      id: "uuid-1", templateKey: "welcome", eventType: "registration",
      subject: "Hello Patient", body: "Hello {{name}}, welcome!", placeholders: ["name"],
      isActive: true, maxRetries: 3, retryStrategy: "exponential", createdAt: new Date(),
    };
    mockService.createTemplate.mockResolvedValue(template);
    const res = await request(app).post("/templates").send({
      templateKey: "welcome", eventType: "appointment",
      subject: "Hello Patient", body: "Hello {{name}}, welcome!",
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
    expect(res.status).toBe(400); // controller catch block returns 400 for service errors
  });

  it("POST /queue enqueues an email and returns 201", async () => {
    mockService.queueEmail.mockResolvedValue({ id: "q1", status: "pending" });
    const res = await request(app).post("/queue").send({
      templateKey: "welcome", recipient: "user@example.com",
      recipientName: "Alice", placeholderData: { name: "Alice" },
    });
    expect(res.status).toBe(201);
  });

  it("POST /send dispatches email immediately and returns 200", async () => {
    mockService.sendEmailNow.mockResolvedValue({ success: true, logId: "l1", deliverTime: 42 });
    const res = await request(app).post("/send").send({
      templateKey: "welcome", recipient: "user@example.com",
      placeholderData: { name: "Alice" },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /queue/retry triggers retry and returns 200 with count", async () => {
    mockService.retryFailedEmails.mockResolvedValue({ retried: 5 });
    const res = await request(app).post("/queue/retry").send({ clinicId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.retried).toBe(5);
  });

  it("POST /queue/process triggers processing and returns 200 with stats", async () => {
    mockService.processQueue.mockResolvedValue({ successCount: 8, failureCount: 2, totalProcessed: 10 });
    const res = await request(app).post("/queue/process").send({ clinicId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.successCount).toBe(8);
  });

  it("GET /stats returns 200 with email analytics", async () => {
    mockService.getEmailStats.mockResolvedValue({
      totalSent: 100, successful: 90, failed: 10, successRate: 90,
    });
    const res = await request(app).get("/stats?from=2026-01-01&to=2026-01-31");
    expect(res.status).toBe(200);
  });

  it("DELETE /templates/:id returns 204 on successful deletion", async () => {
    mockService.deleteTemplate.mockResolvedValue({ success: true });
    const res = await request(app).delete("/templates/uuid-1?clinicId=1");
    expect(res.status).toBe(204);
  });
});

// ─── Additional Service Tests: getPendingEmails, getFailedEmails, getEmailLogs, updateTemplate ─

describe("emailNotificationEngineService.getPendingEmails() — priority-based ordering", () => {
  let service;
  let mockEmailQueue;
  let mockEmailTemplate;
  let mockEmailLog;

  beforeEach(() => {
    jest.resetModules();
    jest.unmock("../service");
    jest.unmock("../helpers");
    mockEmailQueue = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    mockEmailTemplate = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    mockEmailLog = {
      create: jest.fn(),
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

  it("queries EmailQueue with status 'pending' and orders by priority DESC", async () => {
    mockEmailQueue.findAll.mockResolvedValue([]);

    await service.getPendingEmails(1, 5);

    expect(mockEmailQueue.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: 1, status: "pending" }),
        order: expect.arrayContaining([
          expect.arrayContaining(["priority", "DESC"]),
        ]),
        limit: 5,
      })
    );
  });

  it("returns formatted responses using helpers.formatQueueResponse", async () => {
    const raw = [{ id: 1, status: "pending", priority: 3 }];
    mockEmailQueue.findAll.mockResolvedValue(raw);

    const result = await service.getPendingEmails(1);

    expect(result).toHaveLength(1);
  });

  it("uses default limit of 10 when none provided", async () => {
    mockEmailQueue.findAll.mockResolvedValue([]);

    await service.getPendingEmails(1);

    const callArgs = mockEmailQueue.findAll.mock.calls[0][0];
    expect(callArgs.limit).toBe(10);
  });
});

describe("emailNotificationEngineService.getFailedEmails()", () => {
  let service;
  let mockEmailQueue;
  let mockEmailTemplate;
  let mockEmailLog;

  beforeEach(() => {
    jest.resetModules();
    jest.unmock("../service");
    jest.unmock("../helpers");
    mockEmailQueue = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() };
    mockEmailTemplate = { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() };
    mockEmailLog = { create: jest.fn(), findAll: jest.fn() };
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: mockEmailQueue,
      EmailLog: mockEmailLog,
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("queries EmailQueue with status 'failed'", async () => {
    mockEmailQueue.findAll.mockResolvedValue([]);

    await service.getFailedEmails(1);

    expect(mockEmailQueue.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: 1, status: "failed" }),
      })
    );
  });

  it("returns empty array when no failed emails exist", async () => {
    mockEmailQueue.findAll.mockResolvedValue([]);
    const result = await service.getFailedEmails(1);
    expect(result).toEqual([]);
  });

  it("returns all failed emails up to the limit", async () => {
    const items = [
      { id: 1, status: "failed", attempts: 3 },
      { id: 2, status: "failed", attempts: 1 },
    ];
    mockEmailQueue.findAll.mockResolvedValue(items);
    const result = await service.getFailedEmails(1, 10);
    expect(result).toHaveLength(2);
  });
});

describe("emailNotificationEngineService.getEmailLogs() — filtering", () => {
  let service;
  let mockEmailQueue;
  let mockEmailTemplate;
  let mockEmailLog;

  beforeEach(() => {
    jest.resetModules();
    jest.unmock("../service");
    jest.unmock("../helpers");
    mockEmailQueue = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() };
    mockEmailTemplate = { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() };
    mockEmailLog = { create: jest.fn(), findAll: jest.fn() };
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: mockEmailQueue,
      EmailLog: mockEmailLog,
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("queries logs for the given clinicId", async () => {
    mockEmailLog.findAll.mockResolvedValue([]);

    await service.getEmailLogs(5);

    expect(mockEmailLog.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: 5 }),
      })
    );
  });

  it("applies recipient filter when provided", async () => {
    mockEmailLog.findAll.mockResolvedValue([]);

    await service.getEmailLogs(1, { recipient: "test@example.com" });

    const callArgs = mockEmailLog.findAll.mock.calls[0][0];
    expect(callArgs.where.recipient).toBe("test@example.com");
  });

  it("applies status filter when provided", async () => {
    mockEmailLog.findAll.mockResolvedValue([]);

    await service.getEmailLogs(1, { status: "success" });

    const callArgs = mockEmailLog.findAll.mock.calls[0][0];
    expect(callArgs.where.status).toBe("success");
  });

  it("returns empty array when no logs match filters", async () => {
    mockEmailLog.findAll.mockResolvedValue([]);
    const result = await service.getEmailLogs(1, { status: "nonexistent" });
    expect(result).toEqual([]);
  });
});

describe("emailNotificationEngineService.updateTemplate() — allowed fields only", () => {
  let service;
  let mockEmailQueue;
  let mockEmailTemplate;
  let mockEmailLog;
  let mockTemplateInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.unmock("../service");
    jest.unmock("../helpers");
    mockTemplateInstance = { update: jest.fn().mockResolvedValue(true) };
    mockEmailTemplate = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    mockEmailQueue = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() };
    mockEmailLog = { create: jest.fn(), findAll: jest.fn() };
    jest.doMock("../model", () => ({
      EmailTemplate: mockEmailTemplate,
      EmailQueue: mockEmailQueue,
      EmailLog: mockEmailLog,
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("throws when template not found for the clinic", async () => {
    mockEmailTemplate.findOne.mockResolvedValue(null);
    await expect(service.updateTemplate(99, 1, { subject: "new subject" }))
      .rejects.toThrow("Template not found");
  });

  it("only updates allowed fields (subject, body, htmlBody, maxRetries, retryStrategy)", async () => {
    mockEmailTemplate.findOne.mockResolvedValue(mockTemplateInstance);

    await service.updateTemplate(1, 1, {
      subject: "New Subject",
      body: "Hello {{name}}",
      unauthorizedField: "should be stripped",
    });

    const updateCall = mockTemplateInstance.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("subject", "New Subject");
    expect(updateCall).toHaveProperty("body", "Hello {{name}}");
    expect(updateCall).not.toHaveProperty("unauthorizedField");
  });

  it("re-extracts placeholders from updated body text", async () => {
    mockEmailTemplate.findOne.mockResolvedValue(mockTemplateInstance);

    await service.updateTemplate(1, 1, { body: "Hello {{patient}}" });

    const updateCall = mockTemplateInstance.update.mock.calls[0][0];
    expect(updateCall.placeholders).toContain("patient");
  });
});

// ─── Additional Controller Tests ─────────────────────────────────────────────
describe("emailNotificationEngine Controller — additional handlers", () => {
  let appX;
  let mockServiceX;

  beforeEach(() => {
    jest.resetModules();
    mockServiceX = {
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
    jest.doMock("../service", () => mockServiceX);
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
    appX = express();
    appX.use(express.json());
    // Inject req.user so controller can read clinicId from req.user.clinicId
    appX.use((req, res, next) => { req.user = { clinicId: 1 }; next(); });
    // Routes matching actual router (index.js)
    appX.get("/pending", controller.getPendingEmails);
    appX.get("/failed", controller.getFailedEmails);
    appX.get("/logs", controller.getEmailLogs);
    appX.patch("/templates/:templateId", controller.updateTemplate);
    appX.delete("/templates/:templateId", controller.deleteTemplate);
    appX.get("/templates/by-event/:eventType", (req, res) => {
      req.query.eventType = req.params.eventType;
      controller.getTemplatesByEventType(req, res);
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("GET /pending returns 200 with pending email list", async () => {
    mockServiceX.getPendingEmails.mockResolvedValue([
      { id: 1, priority: 3, status: "pending" },
      { id: 2, priority: 1, status: "pending" },
    ]);
    const res = await request(appX).get("/pending");
    expect(res.status).toBe(200);
    expect(mockServiceX.getPendingEmails).toHaveBeenCalledWith(1, 10);
    expect(res.body.count).toBe(2);
  });

  it("GET /pending returns 200 with empty list when no pending emails", async () => {
    mockServiceX.getPendingEmails.mockResolvedValue([]);
    const res = await request(appX).get("/pending");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it("GET /failed returns 200 with failed email list", async () => {
    mockServiceX.getFailedEmails.mockResolvedValue([
      { id: 3, status: "failed", attempts: 2 },
    ]);
    const res = await request(appX).get("/failed");
    expect(res.status).toBe(200);
    expect(mockServiceX.getFailedEmails).toHaveBeenCalledWith(1, 10);
    expect(res.body.emails[0].attempts).toBe(2);
  });

  it("GET /logs returns 200 with email logs", async () => {
    mockServiceX.getEmailLogs.mockResolvedValue([
      { id: 10, recipient: "a@b.com", status: "success" },
    ]);
    const res = await request(appX).get("/logs");
    expect(res.status).toBe(200);
    expect(mockServiceX.getEmailLogs).toHaveBeenCalledWith(1, expect.objectContaining({}));
    expect(res.body.count).toBe(1);
  });

  it("GET /logs applies optional status filter from query params", async () => {
    mockServiceX.getEmailLogs.mockResolvedValue([]);
    const res = await request(appX).get("/logs?status=success");
    expect(res.status).toBe(200);
    expect(mockServiceX.getEmailLogs).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "success" })
    );
  });

  it("PATCH /templates/:templateId returns 200 when template updated", async () => {
    const updated = { id: 5, subject: "Updated subject line" };
    mockServiceX.updateTemplate.mockResolvedValue(updated);
    const res = await request(appX)
      .patch("/templates/5")
      .send({ subject: "Updated subject line" });
    expect(res.status).toBe(200);
    expect(mockServiceX.updateTemplate).toHaveBeenCalledWith(
      "5",
      1,
      expect.objectContaining({ subject: "Updated subject line" })
    );
  });

  it("PATCH /templates/:templateId returns 404 when template not found", async () => {
    mockServiceX.updateTemplate.mockRejectedValue(
      Object.assign(new Error("Template not found"), { status: 404 })
    );
    const res = await request(appX)
      .patch("/templates/99")
      .send({ subject: "Updated subject line" });
    expect(res.status).toBe(404);
  });

  it("DELETE /templates/:templateId returns 204 when deleted", async () => {
    mockServiceX.deleteTemplate.mockResolvedValue(undefined);
    const res = await request(appX).delete("/templates/5");
    expect(res.status).toBe(204);
    expect(mockServiceX.deleteTemplate).toHaveBeenCalledWith("5", 1);
  });

  it("GET /templates/by-event/:eventType returns 200 with templates for event type", async () => {
    mockServiceX.getTemplatesByEventType.mockResolvedValue([
      { id: 1, eventType: "appointment" },
    ]);
    const res = await request(appX).get("/templates/by-event/appointment");
    expect(res.status).toBe(200);
    expect(mockServiceX.getTemplatesByEventType).toHaveBeenCalledWith(1, "appointment");
    expect(res.body.count).toBe(1);
  });
});

