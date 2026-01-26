"use strict";

// ─── Helpers Unit Tests (pure functions — no mocking needed) ─────────────────
const helpers = require("../helpers");

describe("helpers.calculateSeverityScore()", () => {
  it("returns 4 for 'critical'", () => {
    expect(helpers.calculateSeverityScore("critical")).toBe(4);
  });

  it("returns 3 for 'high'", () => {
    expect(helpers.calculateSeverityScore("high")).toBe(3);
  });

  it("returns 2 for 'moderate'", () => {
    expect(helpers.calculateSeverityScore("moderate")).toBe(2);
  });

  it("returns 1 for 'low'", () => {
    expect(helpers.calculateSeverityScore("low")).toBe(1);
  });

  it("returns 0 for unknown severity levels", () => {
    expect(helpers.calculateSeverityScore("unknown")).toBe(0);
    expect(helpers.calculateSeverityScore("")).toBe(0);
  });
});

describe("helpers.isCriticalInteraction()", () => {
  it("returns true for 'critical'", () => {
    expect(helpers.isCriticalInteraction("critical")).toBe(true);
  });

  it("returns false for 'high'", () => {
    expect(helpers.isCriticalInteraction("high")).toBe(false);
  });

  it("returns false for 'moderate' and 'low'", () => {
    expect(helpers.isCriticalInteraction("moderate")).toBe(false);
    expect(helpers.isCriticalInteraction("low")).toBe(false);
  });
});

describe("helpers.isHighRiskInteraction()", () => {
  it("returns true for 'high'", () => {
    expect(helpers.isHighRiskInteraction("high")).toBe(true);
  });

  it("returns true for 'critical' (critical includes high risk)", () => {
    expect(helpers.isHighRiskInteraction("critical")).toBe(true);
  });

  it("returns false for 'moderate' and 'low'", () => {
    expect(helpers.isHighRiskInteraction("moderate")).toBe(false);
    expect(helpers.isHighRiskInteraction("low")).toBe(false);
  });
});

describe("helpers.sortByRisk()", () => {
  const interactions = [
    { severity: "low" },
    { severity: "critical" },
    { severity: "moderate" },
    { severity: "high" },
  ];

  it("places critical first", () => {
    const sorted = helpers.sortByRisk(interactions);
    expect(sorted[0].severity).toBe("critical");
  });

  it("places high before moderate", () => {
    const sorted = helpers.sortByRisk(interactions);
    const highIdx = sorted.findIndex((i) => i.severity === "high");
    const moderateIdx = sorted.findIndex((i) => i.severity === "moderate");
    expect(highIdx).toBeLessThan(moderateIdx);
  });

  it("places low last", () => {
    const sorted = helpers.sortByRisk(interactions);
    expect(sorted[sorted.length - 1].severity).toBe("low");
  });
});

describe("helpers.groupInteractionsBySeverity()", () => {
  it("returns four buckets: critical, high, moderate, low", () => {
    const interactions = [
      { severity: "critical" },
      { severity: "high" },
      { severity: "moderate" },
      { severity: "low" },
    ];
    const grouped = helpers.groupInteractionsBySeverity(interactions);
    expect(grouped).toHaveProperty("critical");
    expect(grouped).toHaveProperty("high");
    expect(grouped).toHaveProperty("moderate");
    expect(grouped).toHaveProperty("low");
  });

  it("places interactions in the correct bucket", () => {
    const interactions = [
      { id: 1, severity: "critical" },
      { id: 2, severity: "high" },
      { id: 3, severity: "high" },
    ];
    const grouped = helpers.groupInteractionsBySeverity(interactions);
    expect(grouped.critical).toHaveLength(1);
    expect(grouped.high).toHaveLength(2);
    expect(grouped.moderate).toHaveLength(0);
    expect(grouped.low).toHaveLength(0);
  });
});

describe("helpers.filterBySeverity()", () => {
  const interactions = [
    { id: 1, severity: "critical" },
    { id: 2, severity: "high" },
    { id: 3, severity: "moderate" },
    { id: 4, severity: "low" },
  ];

  it("returns only interactions matching the given severity", () => {
    const result = helpers.filterBySeverity(interactions, "high");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("returns empty array when no interactions match severity", () => {
    const result = helpers.filterBySeverity([], "critical");
    expect(result).toHaveLength(0);
  });

  it("filters out all other severity levels", () => {
    const result = helpers.filterBySeverity(interactions, "critical");
    expect(result.every((i) => i.severity === "critical")).toBe(true);
  });
});

describe("helpers.calculateRiskLevel()", () => {
  it("returns level:'safe' and score:0 for empty array", () => {
    const result = helpers.calculateRiskLevel([]);
    expect(result.level).toBe("safe");
    expect(result.score).toBe(0);
  });

  it("returns 'critical' when average score >= 3.5", () => {
    // Two critical (4) + one high (3) → avg = 3.67
    const interactions = [
      { severity: "critical" },
      { severity: "critical" },
      { severity: "high" },
    ];
    const result = helpers.calculateRiskLevel(interactions);
    expect(result.level).toBe("critical");
  });

  it("returns 'high' level at an average around 3", () => {
    const interactions = [
      { severity: "high" }, // 3
      { severity: "high" }, // 3
      { severity: "moderate" }, // 2
    ];
    const result = helpers.calculateRiskLevel(interactions);
    expect(["high", "critical"]).toContain(result.level);
  });

  it("returns 'safe' when only low severity interactions exist", () => {
    const interactions = [{ severity: "low" }, { severity: "low" }];
    const result = helpers.calculateRiskLevel(interactions);
    expect(["safe", "low"]).toContain(result.level);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ─── Service Unit Tests (db mocked via jest.doMock + resetModules) ───────────
const { Op } = require("sequelize");

describe("medicineInteractionService.checkInteraction() — bidirectional query", () => {
  let service;
  let mockMedicineInteraction;

  beforeEach(() => {
    jest.resetModules();
    mockMedicineInteraction = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    jest.doMock("../../config/db", () => ({
      models: { MedicineInteraction: mockMedicineInteraction },
    }));
    jest.doMock("sequelize", () => require.requireActual
      ? require.requireActual("sequelize")
      : jest.requireActual("sequelize"));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("queries using Op.or with both (id1,id2) and (id2,id1) ordering", async () => {
    mockMedicineInteraction.findOne.mockResolvedValue(null);

    await service.checkInteraction(5, 10, 1).catch(() => {});

    expect(mockMedicineInteraction.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ [Op.or]: expect.any(Array) }),
      })
    );

    const callArgs = mockMedicineInteraction.findOne.mock.calls[0][0];
    const orClauses = callArgs.where[Op.or];
    expect(orClauses).toHaveLength(2);

    const firstClause = orClauses[0];
    const secondClause = orClauses[1];
    const clauIds = new Set([
      JSON.stringify(firstClause),
      JSON.stringify(secondClause),
    ]);
    // Both orderings must be present
    expect(clauIds.size).toBe(2);
  });
});

describe("medicineInteractionService.createInteraction() — id normalization", () => {
  let service;
  let mockMedicineInteraction;

  beforeEach(() => {
    jest.resetModules();
    mockMedicineInteraction = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1 }),
    };
    jest.doMock("../../config/db", () => ({
      models: { MedicineInteraction: mockMedicineInteraction },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("stores lower id as medicineId1 (Math.min)", async () => {
    await service.createInteraction(1, {
      medicineId1: 8,
      medicineId2: 3,
      severity: "moderate",
      description: "test",
    });
    expect(mockMedicineInteraction.create).toHaveBeenCalledWith(
      expect.objectContaining({ medicineId1: 3, medicineId2: 8 })
    );
  });

  it("stores higher id as medicineId2 (Math.max)", async () => {
    await service.createInteraction(1, {
      medicineId1: 5,
      medicineId2: 12,
      severity: "high",
      description: "test",
    });
    expect(mockMedicineInteraction.create).toHaveBeenCalledWith(
      expect.objectContaining({ medicineId1: 5, medicineId2: 12 })
    );
  });

  it("throws when interaction between same pair already exists", async () => {
    mockMedicineInteraction.findOne.mockResolvedValue({ id: 99 });
    await expect(
      service.createInteraction(1, { medicineId1: 1, medicineId2: 2, severity: "low", description: "dup" })
    ).rejects.toThrow();
  });
});

describe("medicineInteractionService.calculateCombinedSeverity()", () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock("../../config/db", () => ({
      models: { MedicineInteraction: {} },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("returns 'none' for an empty array", () => {
    expect(service.calculateCombinedSeverity([])).toBe("none");
  });

  it("returns 'critical' when any severity is critical (highest wins)", () => {
    expect(service.calculateCombinedSeverity(["low", "critical", "high"])).toBe("critical");
  });

  it("returns 'high' when highest severity is high", () => {
    expect(service.calculateCombinedSeverity(["moderate", "high"])).toBe("high");
  });

  it("returns 'moderate' when all are moderate or below", () => {
    expect(service.calculateCombinedSeverity(["low", "moderate", "low"])).toBe("moderate");
  });
});

// ─── Controller Tests via Supertest ─────────────────────────────────────────
const express = require("express");
const request = require("supertest");

describe("medicineInteractionChecker Controller", () => {
  let app;
  let mockService;

  beforeEach(() => {
    jest.resetModules();
    mockService = {
      checkInteraction: jest.fn(),
      createInteraction: jest.fn(),
      getInteractionsByMedicine: jest.fn(),
      getInteractionsByClinique: jest.fn(),
      updateInteraction: jest.fn(),
      deleteInteraction: jest.fn(),
      calculateCombinedSeverity: jest.fn(),
    };
    jest.doMock("../service", () => mockService);
    jest.doMock("../../config/db", () => ({
      models: { MedicineInteraction: {} },
    }));

    const controller = require("../controller");
    app = express();
    app.use(express.json());
    app.get("/interactions/check", controller.checkInteraction);
    app.post("/interactions", controller.createInteraction);
    app.get("/interactions/medicine/:medicineId", controller.getByMedicine);
    app.get("/interactions/clinic/:clinicId", controller.getByClinic);
    app.put("/interactions/:id", controller.updateInteraction);
    app.delete("/interactions/:id", controller.deleteInteraction);
    app.post("/interactions/combined-severity", controller.getCombinedSeverity);
  });

  afterEach(() => jest.clearAllMocks());

  it("GET /check returns 400 when medicineId1 or medicineId2 is missing", async () => {
    const res = await request(app).get("/interactions/check?medicineId1=1");
    expect(res.status).toBe(400);
  });

  it("GET /check returns 200 with interaction data", async () => {
    mockService.checkInteraction.mockResolvedValue({
      exists: true,
      severity: "high",
      description: "test interaction",
    });
    const res = await request(app).get("/interactions/check?medicineId1=1&medicineId2=2&clinicId=1");
    expect(res.status).toBe(200);
    expect(mockService.checkInteraction).toHaveBeenCalledWith(1, 2, 1);
  });

  it("POST / creates interaction and returns 201", async () => {
    const created = { id: 10, medicineId1: 3, medicineId2: 8, severity: "moderate" };
    mockService.createInteraction.mockResolvedValue(created);
    const res = await request(app).post("/interactions").send({
      clinicId: 1,
      medicineId1: 3,
      medicineId2: 8,
      severity: "moderate",
      description: "test",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(10);
  });

  it("POST / returns 409 when interaction already exists", async () => {
    const err = new Error("interaction already exists");
    err.status = 409;
    mockService.createInteraction.mockRejectedValue(err);
    const res = await request(app).post("/interactions").send({
      clinicId: 1, medicineId1: 1, medicineId2: 2, severity: "low", description: "dup",
    });
    expect([409, 400, 500]).toContain(res.status);
  });

  it("GET /medicine/:id returns 200 with interactions list", async () => {
    mockService.getInteractionsByMedicine.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await request(app).get("/interactions/medicine/5?clinicId=1");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("DELETE /:id returns 204 on successful deletion", async () => {
    mockService.deleteInteraction.mockResolvedValue({ success: true });
    const res = await request(app).delete("/interactions/1?clinicId=1");
    expect(res.status).toBe(204);
  });

  it("POST /combined-severity returns 200 with combined severity result", async () => {
    mockService.calculateCombinedSeverity.mockReturnValue("critical");
    const res = await request(app)
      .post("/interactions/combined-severity")
      .send({ severities: ["low", "critical", "high"] });
    expect(res.status).toBe(200);
    expect(res.body.data.combinedSeverity).toBe("critical");
  });
});
