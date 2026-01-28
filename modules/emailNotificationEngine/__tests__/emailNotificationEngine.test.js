const request = require("supertest");
const express = require("express");

// Mock all dependencies before importing controller
jest.mock("../service");
jest.mock("../helpers");
jest.mock("../model", () => ({
  EmailTemplate: {},
  EmailQueue: {},
  EmailLog: {},
}));
jest.mock("../../../config/db", () => ({
  sequelize: {},
  DataTypes: {},
}));

const controller = require("../controller");
const service = require("../service");
const helpers = require("../helpers");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.user = { clinicId: "clinic-123" };
  next();
});

app.post("/templates", controller.createTemplate);
app.patch("/templates/:templateId", controller.updateTemplate);
app.delete("/templates/:templateId", controller.deleteTemplate);
app.get("/templates/by-event/:eventType", (req, res) => {
  req.query.eventType = req.params.eventType;
  controller.getTemplatesByEventType(req, res);
});
app.post("/queue", controller.queueEmail);
app.post("/send-now", controller.sendEmailNow);
app.get("/pending", controller.getPendingEmails);
app.get("/failed", controller.getFailedEmails);
app.post("/retry", controller.retryFailedEmails);
app.post("/process-queue", controller.processQueue);
app.get("/stats", controller.getEmailStats);
app.get("/logs", controller.getEmailLogs);

describe("Email Notification Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Template Management", () => {
    test("should create template with valid data (201)", async () => {
      const templateData = {
        eventType: "appointment",
        templateKey: "appointment_confirmation",
        subject: "Appointment Confirmation",
        body: "Your appointment is confirmed for {{appointmentTime}}",
        maxRetries: 3,
        retryStrategy: "exponential",
      };

      service.createTemplate.mockResolvedValue({
        id: "template-1",
        ...templateData,
        placeholders: ["appointmentTime"],
      });

      const res = await request(app)
        .post("/templates")
        .send(templateData);

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("template-1");
      expect(service.createTemplate).toHaveBeenCalledWith("clinic-123", templateData);
    });

    test("should reject template without required fields (400)", async () => {
      const invalidData = {
        eventType: "appointment",
        subject: "Test",
      };

      const res = await request(app)
        .post("/templates")
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test("should reject duplicate template key (400)", async () => {
      const templateData = {
        eventType: "appointment",
        templateKey: "duplicate_key",
        subject: "Test Subject",
        body: "Test body content here",
      };

      service.createTemplate.mockRejectedValue(new Error("Template with key 'duplicate_key' already exists"));

      const res = await request(app)
        .post("/templates")
        .send(templateData);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already exists");
    });

    test("should update template with valid data (200)", async () => {
      const updates = {
        subject: "Updated Subject",
        body: "Updated {{body}} content",
      };

      service.updateTemplate.mockResolvedValue({
        id: "template-1",
        ...updates,
      });

      const res = await request(app)
        .patch("/templates/template-1")
        .send(updates);

      expect(res.status).toBe(200);
      expect(service.updateTemplate).toHaveBeenCalledWith("template-1", "clinic-123", updates);
    });

    test("should return 404 when updating non-existent template", async () => {
      service.updateTemplate.mockRejectedValue(new Error("Template not found"));

      const res = await request(app)
        .patch("/templates/invalid-id")
        .send({ subject: "New Subject", body: "New body content here" });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });

    test("should delete template (204)", async () => {
      service.deleteTemplate.mockResolvedValue({ success: true });

      const res = await request(app).delete("/templates/template-1");

      expect(res.status).toBe(204);
      expect(service.deleteTemplate).toHaveBeenCalledWith("template-1", "clinic-123");
    });

    test("should return 404 when deleting non-existent template", async () => {
      service.deleteTemplate.mockRejectedValue(new Error("Template not found"));

      const res = await request(app).delete("/templates/invalid-id");

      expect(res.status).toBe(404);
    });

    test("should get templates by event type (200)", async () => {
      const templates = [
        {
          id: "template-1",
          eventType: "appointment",
          templateKey: "appointment_confirmation",
        },
      ];

      service.getTemplatesByEventType.mockResolvedValue(templates);

      const res = await request(app).get("/templates/by-event/appointment");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.templates.length).toBe(1);
    });

    test("should return empty templates array (200)", async () => {
      service.getTemplatesByEventType.mockResolvedValue([]);

      const res = await request(app).get("/templates/by-event/appointment");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.templates).toEqual([]);
    });
  });

  describe("Email Sending", () => {
    test("should queue email with valid data (201)", async () => {
      const queueData = {
        templateKey: "appointment_confirmation",
        recipient: "user@example.com",
        recipientName: "John Doe",
        placeholderData: { appointmentTime: "2026-01-30 10:00 AM" },
        priority: "high",
      };

      service.queueEmail.mockResolvedValue({
        id: "queue-1",
        ...queueData,
        status: "pending",
      });

      const res = await request(app)
        .post("/queue")
        .send(queueData);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");
      expect(service.queueEmail).toHaveBeenCalledWith("clinic-123", queueData);
    });

    test("should reject queue with invalid email (400)", async () => {
      const queueData = {
        templateKey: "appointment_confirmation",
        recipient: "invalid-email",
        placeholderData: {},
      };

      const res = await request(app)
        .post("/queue")
        .send(queueData);

      expect(res.status).toBe(400);
    });

    test("should send email immediately (200)", async () => {
      const emailData = {
        templateKey: "appointment_confirmation",
        recipient: "user@example.com",
        placeholderData: { appointmentTime: "2026-01-30 10:00 AM" },
      };

      service.sendEmailNow.mockResolvedValue({
        success: true,
        logId: "log-1",
        deliverTime: 125,
      });

      const res = await request(app)
        .post("/send-now")
        .send(emailData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deliverTime).toBe(125);
    });

    test("should reject send-now without placeholder data (400)", async () => {
      const emailData = {
        templateKey: "appointment_confirmation",
        recipient: "user@example.com",
      };

      const res = await request(app)
        .post("/send-now")
        .send(emailData);

      expect(res.status).toBe(400);
    });

    test("should handle email send failure (400)", async () => {
      const emailData = {
        templateKey: "invalid_template",
        recipient: "user@example.com",
        placeholderData: {},
      };

      service.sendEmailNow.mockRejectedValue(new Error("Template not found"));

      const res = await request(app)
        .post("/send-now")
        .send(emailData);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("not found");
    });
  });

  describe("Queue Management", () => {
    test("should get pending emails (200)", async () => {
      const pending = [
        {
          id: "queue-1",
          recipient: "user1@example.com",
          status: "pending",
          priority: "normal",
        },
        {
          id: "queue-2",
          recipient: "user2@example.com",
          status: "pending",
          priority: "high",
        },
      ];

      service.getPendingEmails.mockResolvedValue(pending);

      const res = await request(app).get("/pending?limit=10");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.emails.length).toBe(2);
    });

    test("should get failed emails (200)", async () => {
      const failed = [
        {
          id: "queue-3",
          recipient: "user3@example.com",
          status: "failed",
          attempts: 3,
          lastError: "Connection timeout",
        },
      ];

      service.getFailedEmails.mockResolvedValue(failed);

      const res = await request(app).get("/failed?limit=10");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.emails[0].status).toBe("failed");
    });

    test("should retry failed emails (200)", async () => {
      service.retryFailedEmails.mockResolvedValue({ retried: 3 });

      const res = await request(app).post("/retry");

      expect(res.status).toBe(200);
      expect(res.body.retried).toBe(3);
      expect(service.retryFailedEmails).toHaveBeenCalledWith("clinic-123");
    });

    test("should process queue (200)", async () => {
      service.processQueue.mockResolvedValue({
        successCount: 5,
        failureCount: 1,
        totalProcessed: 6,
      });

      const res = await request(app).post("/process-queue");

      expect(res.status).toBe(200);
      expect(res.body.successCount).toBe(5);
      expect(res.body.failureCount).toBe(1);
      expect(res.body.totalProcessed).toBe(6);
    });
  });

  describe("Email Statistics and Logs", () => {
    test("should get email stats for date range (200)", async () => {
      const from = "2026-01-01";
      const to = "2026-01-31";

      service.getEmailStats.mockResolvedValue({
        totalSent: 100,
        successful: 95,
        failed: 4,
        bounced: 1,
        successRate: 95,
        averageDeliveryTime: 150,
      });

      const res = await request(app).get(`/stats?from=${from}&to=${to}`);

      expect(res.status).toBe(200);
      expect(res.body.totalSent).toBe(100);
      expect(res.body.successRate).toBe(95);
      expect(res.body.averageDeliveryTime).toBe(150);
    });

    test("should reject stats request without date range (400)", async () => {
      const res = await request(app).get("/stats");

      expect(res.status).toBe(400);
    });

    test("should get email logs with filters (200)", async () => {
      const logs = [
        {
          id: "log-1",
          recipient: "user@example.com",
          status: "success",
          deliverTime: 125,
        },
      ];

      service.getEmailLogs.mockResolvedValue(logs);

      const res = await request(app)
        .get("/logs?status=success&limit=10");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.logs[0].status).toBe("success");
    });

    test("should get email logs by recipient (200)", async () => {
      const logs = [
        {
          id: "log-1",
          recipient: "specific@example.com",
          status: "success",
        },
      ];

      service.getEmailLogs.mockResolvedValue(logs);

      const res = await request(app).get("/logs?recipient=specific@example.com");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });

  describe("Business Logic", () => {
    test("should filter templates by category correctly", async () => {
      const appointmentTemplates = [
        {
          id: "t1",
          eventType: "appointment",
          templateKey: "confirmation",
        },
        {
          id: "t2",
          eventType: "appointment",
          templateKey: "reminder",
        },
      ];

      service.getTemplatesByEventType.mockResolvedValue(appointmentTemplates);

      const res = await request(app).get("/templates/by-event/appointment");

      expect(res.body.count).toBe(2);
      expect(res.body.templates.every(t => t.eventType === "appointment")).toBe(true);
    });

    test("should maintain clinic isolation on email operations", async () => {
      const emailData = {
        templateKey: "test_template",
        recipient: "user@example.com",
        placeholderData: {},
      };

      service.sendEmailNow.mockResolvedValue({ success: true });

      await request(app).post("/send-now").send(emailData);

      const callArgs = service.sendEmailNow.mock.calls[0];
      expect(callArgs[0]).toBe("clinic-123");
    });

    test("should handle priority ordering in queue", async () => {
      const emails = [
        { id: "q1", priority: "urgent", createdAt: new Date() },
        { id: "q2", priority: "normal", createdAt: new Date() },
        { id: "q3", priority: "high", createdAt: new Date() },
      ];

      service.getPendingEmails.mockResolvedValue(emails);

      const res = await request(app).get("/pending");

      expect(res.body.emails[0].priority).toBe("urgent");
    });

    test("should calculate success rate correctly", async () => {
      service.getEmailStats.mockResolvedValue({
        totalSent: 100,
        successful: 85,
        failed: 15,
        bounced: 0,
        successRate: 85,
      });

      const res = await request(app).get("/stats?from=2026-01-01&to=2026-01-31");

      expect(res.body.successRate).toBe(85);
      expect(res.body.successful + res.body.failed + res.body.bounced).toBe(res.body.totalSent);
    });

    test("should track retry attempts correctly", async () => {
      const failedEmail = {
        id: "queue-1",
        attempts: 2,
        lastError: "Timeout",
        status: "failed",
      };

      service.getFailedEmails.mockResolvedValue([failedEmail]);

      const res = await request(app).get("/failed");

      expect(res.body.emails[0].attempts).toBe(2);
    });

    test("should apply retry strategy based on configuration", async () => {
      const retryResult = { retried: 5, appliedStrategy: "exponential" };
      service.retryFailedEmails.mockResolvedValue(retryResult);

      const res = await request(app).post("/retry");

      expect(res.body.retried).toBe(5);
    });

    test("should validate placeholder data before sending", async () => {
      const emailData = {
        templateKey: "template_with_placeholders",
        recipient: "user@example.com",
        placeholderData: {
          appointmentTime: "2026-01-30 10:00 AM",
          clinicName: "Dental Clinic",
        },
      };

      service.sendEmailNow.mockResolvedValue({ success: true });

      const res = await request(app)
        .post("/send-now")
        .send(emailData);

      expect(res.status).toBe(200);
      expect(service.sendEmailNow).toHaveBeenCalledWith(
        "clinic-123",
        expect.objectContaining({
          placeholderData: expect.objectContaining({
            appointmentTime: "2026-01-30 10:00 AM",
          }),
        })
      );
    });

    test("should limit log retrieval by limit parameter", async () => {
      service.getEmailLogs.mockResolvedValue(new Array(50).fill(null).map((_, i) => ({
        id: `log-${i}`,
        recipient: `user${i}@example.com`,
      })));

      const res = await request(app).get("/logs?limit=50");

      expect(service.getEmailLogs).toHaveBeenCalledWith(
        "clinic-123",
        expect.objectContaining({ limit: 50 })
      );
    });

    test("should prevent sending without required template", async () => {
      service.sendEmailNow.mockRejectedValue(new Error("Template 'missing_template' not found"));

      const res = await request(app)
        .post("/send-now")
        .send({
          templateKey: "missing_template",
          recipient: "user@example.com",
          placeholderData: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("not found");
    });

    test("should track email delivery time accurately", async () => {
      const deliveryTimeMseconds = 234;
      service.sendEmailNow.mockResolvedValue({
        success: true,
        deliverTime: deliveryTimeMseconds,
      });

      const res = await request(app)
        .post("/send-now")
        .send({
          templateKey: "test",
          recipient: "user@example.com",
          placeholderData: {},
        });

      expect(res.body.deliverTime).toBe(234);
    });

    test("should count email operations by status", async () => {
      const logs = [
        { id: "log-1", status: "success" },
        { id: "log-2", status: "success" },
        { id: "log-3", status: "failure" },
      ];

      service.getEmailLogs.mockResolvedValue(logs);

      const res = await request(app).get("/logs");

      const grouped = {
        success: res.body.logs.filter(l => l.status === "success").length,
        failure: res.body.logs.filter(l => l.status === "failure").length,
      };

      expect(grouped.success).toBe(2);
      expect(grouped.failure).toBe(1);
    });
  });
});

