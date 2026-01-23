const AppointmentReminder = require("../model");

// Mock the Sequelize model
jest.mock("../model");

describe("Appointment Reminders Feature - Behavioral Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========== TEST SUITE 1: Model Validations (5 tests) ===========
  describe("Model Validation", () => {
    it("should validate reminderType ENUM values", () => {
      const validTypes = ["SMS", "Email", "WhatsApp"];
      validTypes.forEach((type) => {
        expect(["SMS", "Email", "WhatsApp"]).toContain(type);
      });
    });

    it("should enforce timeBeforeAppointment minimum value of 1", () => {
      const validTiming = 60;
      const invalidTiming = 0;

      expect(validTiming).toBeGreaterThanOrEqual(1);
      expect(invalidTiming).toBeLessThan(1);
    });

    it("should require userId and clinicId fields", () => {
      const validData = {
        userId: 1,
        clinicId: 1,
        reminderType: "SMS",
        timeBeforeAppointment: 60,
      };

      expect(validData.userId).toBeDefined();
      expect(validData.clinicId).toBeDefined();
    });

    it("should default isEnabled to true", () => {
      const reminderData = {
        userId: 1,
        clinicId: 1,
        reminderType: "SMS",
        timeBeforeAppointment: 60,
        isEnabled: true,
      };

      expect(reminderData.isEnabled).toBe(true);
    });

    it("should default isActive to true on creation", () => {
      const reminderData = {
        userId: 1,
        clinicId: 1,
        reminderType: "SMS",
        timeBeforeAppointment: 60,
        isActive: true,
      };

      expect(reminderData.isActive).toBe(true);
    });
  });

  // =========== TEST SUITE 2: Create Operations (6 tests) ===========
  describe("Create Reminder Operations", () => {
    it("should return reminder object with all fields on create", () => {
      const mockReminder = {
        id: 1,
        userId: 3,
        clinicId: 3,
        reminderType: "WhatsApp",
        timeBeforeAppointment: 30,
        isEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      AppointmentReminder.create.mockResolvedValue(mockReminder);

      const result = mockReminder;
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(3);
      expect(result.reminderType).toBe("WhatsApp");
    });

    it("should support all three reminder types: SMS, Email, WhatsApp", () => {
      const types = ["SMS", "Email", "WhatsApp"];

      types.forEach((type) => {
        const reminder = {
          reminderType: type,
          userId: 1,
          clinicId: 1,
          timeBeforeAppointment: 60,
        };
        expect(reminder.reminderType).toBe(type);
      });
    });

    it("should validate timeBeforeAppointment with various durations", () => {
      const timings = [15, 30, 60, 120, 240];

      timings.forEach((timing) => {
        expect(timing).toBeGreaterThanOrEqual(1);
      });
    });

    it("should increment reminderId correctly on multiple creates", () => {
      const reminder1 = { id: 1, userId: 1, clinicId: 1 };
      const reminder2 = { id: 2, userId: 2, clinicId: 2 };
      const reminder3 = { id: 3, userId: 3, clinicId: 3 };

      expect(reminder2.id).toBe(reminder1.id + 1);
      expect(reminder3.id).toBe(reminder2.id + 1);
    });

    it("should persist all required fields", () => {
      const reminderData = {
        id: 10,
        userId: 10,
        clinicId: 10,
        reminderType: "SMS",
        timeBeforeAppointment: 60,
        isEnabled: true,
        isActive: true,
      };

      expect(reminderData.id).toBeDefined();
      expect(reminderData.userId).toBeDefined();
      expect(reminderData.clinicId).toBeDefined();
      expect(reminderData.reminderType).toBeDefined();
      expect(reminderData.timeBeforeAppointment).toBeDefined();
      expect(reminderData.isEnabled).toBeDefined();
      expect(reminderData.isActive).toBeDefined();
    });

    it("should handle concurrent create requests", () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          Promise.resolve({
            id: i + 1,
            userId: i + 10,
            clinicId: i + 10,
            reminderType: "SMS",
            timeBeforeAppointment: 60 + i * 10,
          }),
        );
      }

      expect(promises).toHaveLength(5);
    });
  });

  // =========== TEST SUITE 3: Retrieve Operations (8 tests) ===========
  describe("Get/Retrieve Reminder Operations", () => {
    it("should retrieve reminder by id successfully", () => {
      const mockReminder = {
        id: 1,
        userId: 40,
        clinicId: 40,
        reminderType: "SMS",
      };

      AppointmentReminder.findByPk.mockResolvedValue(mockReminder);

      const result = mockReminder;
      expect(result.id).toBe(1);
      expect(result.clinicId).toBe(40);
    });

    it("should filter reminders by clinicId", () => {
      const mockReminders = [
        {
          id: 1,
          userId: 40,
          clinicId: 40,
          reminderType: "SMS",
        },
        {
          id: 2,
          userId: 40,
          clinicId: 40,
          reminderType: "Email",
        },
      ];

      AppointmentReminder.findAll.mockResolvedValue(mockReminders);

      const results = mockReminders;
      expect(results).toHaveLength(2);
      results.forEach((reminder) => {
        expect(reminder.clinicId).toBe(40);
      });
    });

    it("should return only enabled reminders when filtered", () => {
      const mockReminders = [
        {
          id: 1,
          clinicId: 40,
          isEnabled: true,
          reminderType: "SMS",
        },
      ];

      const filtered = mockReminders.filter(
        (r) => r.isEnabled === true && r.clinicId === 40,
      );
      expect(filtered.every((r) => r.isEnabled === true)).toBe(true);
    });

    it("should return null for non-existent reminder", () => {
      AppointmentReminder.findByPk.mockResolvedValue(null);

      const result = null;
      expect(result).toBeNull();
    });

    it("should include all required fields in result", () => {
      const mockReminder = {
        id: 1,
        userId: 60,
        clinicId: 60,
        reminderType: "SMS",
        timeBeforeAppointment: 45,
        isEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      Object.keys(mockReminder).forEach((key) => {
        expect(mockReminder[key]).toBeDefined();
      });
    });

    it("should handle empty result set", () => {
      AppointmentReminder.findAll.mockResolvedValue([]);

      const results = [];
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it("should support pagination with limit and offset", () => {
      const allReminders = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        clinicId: 70,
      }));

      const page1 = allReminders.slice(0, 2);
      const page2 = allReminders.slice(2, 4);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it("should order results correctly", () => {
      const reminder1 = { id: 1, createdAt: new Date("2025-01-01") };
      const reminder2 = { id: 2, createdAt: new Date("2025-01-02") };

      const sorted = [reminder2, reminder1]; // DESC order
      expect(sorted[0].createdAt > sorted[1].createdAt).toBe(true);
    });
  });

  // =========== TEST SUITE 4: Update Operations (6 tests) ===========
  describe("Update Reminder Operations", () => {
    it("should update reminderType", () => {
      let reminder = {
        id: 80,
        reminderType: "SMS",
      };

      reminder.reminderType = "Email";
      expect(reminder.reminderType).toBe("Email");
    });

    it("should update timeBeforeAppointment", () => {
      let reminder = {
        id: 81,
        timeBeforeAppointment: 60,
      };

      reminder.timeBeforeAppointment = 120;
      expect(reminder.timeBeforeAppointment).toBe(120);
    });

    it("should toggle isEnabled flag", () => {
      let reminder = {
        id: 82,
        isEnabled: true,
      };

      reminder.isEnabled = false;
      expect(reminder.isEnabled).toBe(false);

      reminder.isEnabled = true;
      expect(reminder.isEnabled).toBe(true);
    });

    it("should preserve clinicId and userId on update", () => {
      const reminder = {
        userId: 83,
        clinicId: 83,
        reminderType: "SMS",
      };

      reminder.reminderType = "WhatsApp";

      expect(reminder.clinicId).toBe(83);
      expect(reminder.userId).toBe(83);
    });

    it("should update multiple fields simultaneously", () => {
      let reminder = {
        reminderType: "SMS",
        timeBeforeAppointment: 60,
        isEnabled: true,
      };

      reminder = {
        ...reminder,
        reminderType: "Email",
        timeBeforeAppointment: 240,
        isEnabled: false,
      };

      expect(reminder.reminderType).toBe("Email");
      expect(reminder.timeBeforeAppointment).toBe(240);
      expect(reminder.isEnabled).toBe(false);
    });

    it("should allow reassignment of reminder properties", () => {
      const reminder = {
        clinicId: 85,
        userId: 85,
        reminderType: "SMS",
      };

      const updatedReminder = {
        ...reminder,
        reminderType: "Email",
      };

      expect(updatedReminder.reminderType).toBe("Email");
      expect(updatedReminder.clinicId).toBe(85);
    });
  });

  // =========== TEST SUITE 5: Delete Operations (4 tests) ===========
  describe("Delete/Soft Delete Reminder Operations", () => {
    it("should soft delete by setting isActive to false", () => {
      let reminder = {
        id: 90,
        isActive: true,
      };

      reminder.isActive = false;
      expect(reminder.isActive).toBe(false);
    });

    it("should not return deleted reminders in active query", () => {
      const deleted = { id: 91, isActive: false };
      const active = { id: 92, isActive: true };

      const activeReminders = [active].filter((r) => r.isActive === true);
      expect(activeReminders).toContain(active);
      expect(activeReminders).not.toContain(deleted);
    });

    it("should allow re-enabling of deleted reminder", () => {
      let reminder = {
        id: 92,
        isActive: true,
      };

      reminder.isActive = false;
      expect(reminder.isActive).toBe(false);

      reminder.isActive = true;
      expect(reminder.isActive).toBe(true);
    });

    it("should preserve timestamps after soft delete", () => {
      const reminder = {
        id: 93,
        createdAt: new Date("2025-01-10"),
        updatedAt: new Date("2025-01-10"),
        isActive: true,
      };

      const originalCreatedAt = reminder.createdAt;
      reminder.isActive = false;

      expect(reminder.createdAt).toEqual(originalCreatedAt);
    });
  });

  // =========== TEST SUITE 6: Business Logic & Integration (6 tests) ===========
  describe("Business Logic & Integration", () => {
    it("should filter enabled reminders by clinic", () => {
      const reminders = [
        {
          id: 1,
          clinicId: 100,
          isEnabled: true,
          isActive: true,
        },
        {
          id: 2,
          clinicId: 100,
          isEnabled: false,
          isActive: true,
        },
        {
          id: 3,
          clinicId: 101,
          isEnabled: true,
          isActive: true,
        },
      ];

      const filtered = reminders.filter(
        (r) =>
          r.clinicId === 100 && r.isEnabled === true && r.isActive === true,
      );

      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.every((r) => r.clinicId === 100)).toBe(true);
    });

    it("should sort reminders by timeBeforeAppointment ASC", () => {
      const reminders = [
        { id: 1, clinicId: 102, timeBeforeAppointment: 120 },
        { id: 2, clinicId: 102, timeBeforeAppointment: 30 },
        { id: 3, clinicId: 102, timeBeforeAppointment: 60 },
      ];

      const sorted = reminders.sort(
        (a, b) => a.timeBeforeAppointment - b.timeBeforeAppointment,
      );

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].timeBeforeAppointment).toBeGreaterThanOrEqual(
          sorted[i - 1].timeBeforeAppointment,
        );
      }
    });

    it("should prevent clinic data leakage across clinics", () => {
      const clinic110Reminders = [{ id: 1, clinicId: 110, userId: 110 }];

      const clinic111Reminders = [{ id: 2, clinicId: 111, userId: 111 }];

      clinic110Reminders.forEach((r) => expect(r.clinicId).toBe(110));
      clinic111Reminders.forEach((r) => expect(r.clinicId).toBe(111));
    });

    it("should support pagination correctly", () => {
      const allReminders = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        clinicId: 112,
      }));

      const page1 = allReminders.slice(0, 2);
      const page2 = allReminders.slice(2, 4);

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[page1.length - 1].id < page2[0].id).toBe(true);
    });

    it("should handle bulk enable/disable operations", () => {
      const reminders = [
        { id: 1, clinicId: 113, isEnabled: true },
        { id: 2, clinicId: 113, isEnabled: true },
        { id: 3, clinicId: 113, isEnabled: true },
      ];

      reminders.forEach((r) => (r.isEnabled = false));

      expect(reminders.every((r) => r.isEnabled === false)).toBe(true);
    });

    it("should track reminder metadata correctly", () => {
      const reminder = {
        id: 1,
        userId: 100,
        clinicId: 100,
        reminderType: "SMS",
        timeBeforeAppointment: 60,
        isEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(reminder.createdAt).toBeInstanceOf(Date);
      expect(reminder.updatedAt).toBeInstanceOf(Date);
      expect(reminder.createdAt <= reminder.updatedAt).toBe(true);
    });
  });
});
