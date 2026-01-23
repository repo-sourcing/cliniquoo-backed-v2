"use strict";

// ─── Service Unit Tests ──────────────────────────────────────────────────────
// Mock only the Sequelize model; service logic runs for real.
jest.mock("../model", () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findAndCountAll: jest.fn(),
  findAll: jest.fn(),
}));

const AppointmentReminder = require("../model");
const service = require("../service");

afterEach(() => jest.clearAllMocks());

describe("AppointmentReminderService.create()", () => {
  it("calls model.create with all required fields and returns the result", async () => {
    const data = { userId: 1, clinicId: 2, reminderType: "SMS", timeBeforeAppointment: 30 };
    const mockRecord = { id: 10, ...data, isEnabled: true, isActive: true };
    AppointmentReminder.create.mockResolvedValue(mockRecord);

    const result = await service.create(data);

    expect(AppointmentReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        clinicId: 2,
        reminderType: "SMS",
        timeBeforeAppointment: 30,
        isActive: true,
      })
    );
    expect(result).toEqual(mockRecord);
  });

  it("defaults isEnabled to true when not provided", async () => {
    AppointmentReminder.create.mockResolvedValue({ id: 1 });
    await service.create({ userId: 1, clinicId: 2, reminderType: "Email", timeBeforeAppointment: 15 });
    expect(AppointmentReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: true })
    );
  });

  it("uses caller-supplied isEnabled value when provided", async () => {
    AppointmentReminder.create.mockResolvedValue({ id: 2 });
    await service.create({ userId: 1, clinicId: 2, reminderType: "WhatsApp", timeBeforeAppointment: 60, isEnabled: false });
    expect(AppointmentReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false })
    );
  });

  it("wraps DB errors with a descriptive message", async () => {
    AppointmentReminder.create.mockRejectedValue(new Error("connection refused"));
    await expect(
      service.create({ userId: 1, clinicId: 1, reminderType: "SMS", timeBeforeAppointment: 10 })
    ).rejects.toThrow("Failed to create reminder: connection refused");
  });
});

describe("AppointmentReminderService.getOne()", () => {
  it("returns the reminder when the model finds it", async () => {
    const mock = { id: 5, reminderType: "Email", clinicId: 3 };
    AppointmentReminder.findByPk.mockResolvedValue(mock);
    const result = await service.getOne(5);
    expect(AppointmentReminder.findByPk).toHaveBeenCalledWith(5);
    expect(result).toEqual(mock);
  });

  it("returns null when the reminder does not exist", async () => {
    AppointmentReminder.findByPk.mockResolvedValue(null);
    const result = await service.getOne(9999);
    expect(result).toBeNull();
  });
});

describe("AppointmentReminderService.getAllByClinic()", () => {
  it("queries by clinicId with default limit/offset", async () => {
    AppointmentReminder.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    await service.getAllByClinic(3);
    expect(AppointmentReminder.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clinicId: 3 }, limit: 10, offset: 0 })
    );
  });

  it("includes isEnabled filter when provided", async () => {
    AppointmentReminder.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    await service.getAllByClinic(3, { isEnabled: true });
    expect(AppointmentReminder.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clinicId: 3, isEnabled: true } })
    );
  });

  it("respects custom limit and offset values", async () => {
    AppointmentReminder.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    await service.getAllByClinic(3, { limit: 5, offset: 10 });
    expect(AppointmentReminder.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 })
    );
  });
});

describe("AppointmentReminderService.getEnabledByClinic()", () => {
  it("filters by isEnabled:true AND isActive:true for the given clinicId", async () => {
    AppointmentReminder.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const result = await service.getEnabledByClinic(7);
    expect(AppointmentReminder.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clinicId: 7, isEnabled: true, isActive: true },
      })
    );
    expect(result).toHaveLength(2);
  });
});

describe("AppointmentReminderService.update()", () => {
  it("calls reminder.update with allowed fields", async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ id: 1, reminderType: "Email" });
    AppointmentReminder.findByPk.mockResolvedValue({
      id: 1, reminderType: "SMS", timeBeforeAppointment: 30,
      isEnabled: true, isActive: true, update: mockUpdate,
    });
    const result = await service.update(1, { reminderType: "Email" });
    expect(mockUpdate).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("throws 'Cannot reassign' when clinicId is included in updates", async () => {
    AppointmentReminder.findByPk.mockResolvedValue({ id: 1 });
    await expect(service.update(1, { clinicId: 99 })).rejects.toThrow(
      "Cannot reassign clinic or user"
    );
  });

  it("throws 'Cannot reassign' when userId is included in updates", async () => {
    AppointmentReminder.findByPk.mockResolvedValue({ id: 1 });
    await expect(service.update(1, { userId: 42 })).rejects.toThrow(
      "Cannot reassign clinic or user"
    );
  });

  it("throws 'not found' when reminder does not exist", async () => {
    AppointmentReminder.findByPk.mockResolvedValue(null);
    await expect(service.update(999, { reminderType: "SMS" })).rejects.toThrow("not found");
  });
});

describe("AppointmentReminderService.delete()", () => {
  it("sets isActive to false (soft delete) and returns true", async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    AppointmentReminder.findByPk.mockResolvedValue({ id: 1, update: mockUpdate });
    const result = await service.delete(1);
    expect(mockUpdate).toHaveBeenCalledWith({ isActive: false });
    expect(result).toBe(true);
  });

  it("throws 'not found' when reminder does not exist", async () => {
    AppointmentReminder.findByPk.mockResolvedValue(null);
    await expect(service.delete(999)).rejects.toThrow("not found");
  });
});

describe("AppointmentReminderService.getAllByUser()", () => {
  it("queries by userId with isActive:true", async () => {
    AppointmentReminder.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const result = await service.getAllByUser(5);
    expect(AppointmentReminder.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 5, isActive: true } })
    );
    expect(result).toHaveLength(2);
  });
});

// ─── Validation Schema Tests ─────────────────────────────────────────────────
const {
  createReminderSchema,
  updateReminderSchema,
  queryRemindersSchema,
  reminderIdSchema,
} = require("../validation");

describe("createReminderSchema", () => {
  it("accepts valid data for all three reminder types", () => {
    ["SMS", "Email", "WhatsApp"].forEach((type) => {
      const { error } = createReminderSchema.validate({
        userId: 1, clinicId: 2, reminderType: type, timeBeforeAppointment: 10,
      });
      expect(error).toBeUndefined();
    });
  });

  it("rejects unknown reminderType", () => {
    const { error } = createReminderSchema.validate({
      userId: 1, clinicId: 2, reminderType: "Fax", timeBeforeAppointment: 30,
    });
    expect(error).toBeDefined();
  });

  it("rejects timeBeforeAppointment less than 1", () => {
    const { error } = createReminderSchema.validate({
      userId: 1, clinicId: 2, reminderType: "SMS", timeBeforeAppointment: 0,
    });
    expect(error).toBeDefined();
  });

  it("rejects missing required fields", () => {
    const { error } = createReminderSchema.validate({ reminderType: "SMS" });
    expect(error).toBeDefined();
  });
});

describe("updateReminderSchema", () => {
  it("accepts partial updates without required fields", () => {
    const { error } = updateReminderSchema.validate({ isEnabled: false });
    expect(error).toBeUndefined();
  });

  it("rejects invalid reminderType in update", () => {
    const { error } = updateReminderSchema.validate({ reminderType: "Twitter" });
    expect(error).toBeDefined();
  });

  it("rejects timeBeforeAppointment of 0 in update", () => {
    const { error } = updateReminderSchema.validate({ timeBeforeAppointment: 0 });
    expect(error).toBeDefined();
  });
});

// ─── Controller Tests via Supertest ─────────────────────────────────────────
const express = require("express");
const request = require("supertest");

jest.mock("../service");
const mockedService = require("../service");

const controller = require("../controller");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post("/appointmentReminders/trigger/send-pending", controller.sendPendingReminders);
  app.post("/appointmentReminders/:clinicId", controller.create);
  app.get("/appointmentReminders/:clinicId", controller.getAll);
  app.get("/appointmentReminders/:clinicId/:reminderId", controller.getOne);
  app.patch("/appointmentReminders/:clinicId/:reminderId", controller.update);
  app.delete("/appointmentReminders/:clinicId/:reminderId", controller.delete);
  return app;
}

describe("POST /appointmentReminders/:clinicId", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 201 and created reminder data", async () => {
    const body = { userId: 1, clinicId: 5, reminderType: "SMS", timeBeforeAppointment: 30 };
    mockedService.create.mockResolvedValue({ id: 10, ...body });
    const res = await request(app).post("/appointmentReminders/5").send(body);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.id).toBe(10);
  });

  it("returns 400 when clinicId in URL does not match body", async () => {
    const body = { userId: 1, clinicId: 99, reminderType: "SMS", timeBeforeAppointment: 30 };
    const res = await request(app).post("/appointmentReminders/5").send(body);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown reminderType", async () => {
    const body = { userId: 1, clinicId: 5, reminderType: "Carrier pigeon", timeBeforeAppointment: 30 };
    const res = await request(app).post("/appointmentReminders/5").send(body);
    expect(res.status).toBe(400);
  });
});

describe("GET /appointmentReminders/:clinicId", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 200 with count and reminder rows", async () => {
    mockedService.getAllByClinic.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }], count: 2 });
    const res = await request(app).get("/appointmentReminders/5");
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.reminders).toHaveLength(2);
  });
});

describe("GET /appointmentReminders/:clinicId/:reminderId", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 200 with the reminder when found", async () => {
    mockedService.getOne.mockResolvedValue({ id: 3, reminderType: "Email" });
    const res = await request(app).get("/appointmentReminders/5/3");
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(3);
  });

  it("returns 404 when reminder does not exist", async () => {
    mockedService.getOne.mockResolvedValue(null);
    const res = await request(app).get("/appointmentReminders/5/999");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /appointmentReminders/:clinicId/:reminderId", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 200 with updated reminder", async () => {
    mockedService.update.mockResolvedValue({ id: 3, isEnabled: false });
    const res = await request(app)
      .patch("/appointmentReminders/5/3")
      .send({ isEnabled: false });
    expect(res.status).toBe(200);
  });

  it("returns 404 when reminder not found", async () => {
    mockedService.update.mockRejectedValue(new Error("Reminder not found"));
    const res = await request(app)
      .patch("/appointmentReminders/5/999")
      .send({ isEnabled: false });
    expect(res.status).toBe(404);
  });

  it("returns 400 when attempting to reassign clinic", async () => {
    mockedService.update.mockRejectedValue(new Error("Cannot reassign clinic or user"));
    const res = await request(app)
      .patch("/appointmentReminders/5/3")
      .send({ isEnabled: false });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /appointmentReminders/:clinicId/:reminderId", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 204 on successful soft-delete", async () => {
    mockedService.delete.mockResolvedValue(true);
    const res = await request(app).delete("/appointmentReminders/5/3");
    expect(res.status).toBe(204);
  });

  it("returns 404 when reminder not found", async () => {
    mockedService.delete.mockRejectedValue(new Error("Reminder not found"));
    const res = await request(app).delete("/appointmentReminders/5/999");
    expect(res.status).toBe(404);
  });
});

describe("POST /appointmentReminders/trigger/send-pending", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 200 with count of reminders triggered", async () => {
    mockedService.getEnabledByClinic.mockResolvedValue([
      { id: 1, reminderType: "SMS" },
      { id: 2, reminderType: "Email" },
    ]);
    const res = await request(app)
      .post("/appointmentReminders/trigger/send-pending")
      .send({ clinicId: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.remindersSent).toBe(2);
  });

  it("returns 400 when clinicId is missing", async () => {
    const res = await request(app)
      .post("/appointmentReminders/trigger/send-pending")
      .send({});
    expect(res.status).toBe(400);
  });
});
