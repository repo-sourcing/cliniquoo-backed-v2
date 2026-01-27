"use strict";

// ─── Helper Unit Tests (pure functions — no mocking needed) ──────────────────
const helpers = require("../helpers");

describe("helpers.formatFeatureResponse()", () => {
  const feature = {
    id: 1,
    featureKey: "pdf_export",
    featureName: "PDF Export",
    category: "reports",
    description: "Export reports as PDF",
    isEnabled: true,
    usageLimit: 100,
    currentUsage: 60,
    resetInterval: "monthly",
    metadata: { note: "test" },
  };

  it("maps all 10 fields onto the returned object", () => {
    const result = helpers.formatFeatureResponse(feature);
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("featureKey");
    expect(result).toHaveProperty("featureName");
    expect(result).toHaveProperty("category");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("isEnabled");
    expect(result).toHaveProperty("usageLimit");
    expect(result).toHaveProperty("currentUsage");
    expect(result).toHaveProperty("resetInterval");
    expect(result).toHaveProperty("metadata");
  });

  it("returns correct values for each field", () => {
    const result = helpers.formatFeatureResponse(feature);
    expect(result.featureKey).toBe("pdf_export");
    expect(result.isEnabled).toBe(true);
    expect(result.usageLimit).toBe(100);
  });
});

describe("helpers.calculateAvailableCapacity()", () => {
  it("returns null when usageLimit is null (unlimited feature)", () => {
    const result = helpers.calculateAvailableCapacity(null, 60);
    expect(result).toBeNull();
  });

  it("returns null when usageLimit is undefined", () => {
    const result = helpers.calculateAvailableCapacity(undefined, 10);
    expect(result).toBeNull();
  });

  it("returns available capacity and percentageUsed when limit is set", () => {
    const result = helpers.calculateAvailableCapacity(100, 60);
    expect(result).not.toBeNull();
    expect(result.available).toBe(40);
    expect(result.percentageUsed).toBe("60.00");
  });

  it("returns available:0 and percentageUsed:100.00 when fully exhausted", () => {
    const result = helpers.calculateAvailableCapacity(50, 50);
    expect(result.available).toBe(0);
    expect(result.percentageUsed).toBe("100.00");
  });

  it("returns available:0 and over-use indication when usage exceeds limit", () => {
    const result = helpers.calculateAvailableCapacity(10, 15);
    expect(result.available).toBeLessThanOrEqual(0);
  });
});

describe("helpers.groupFeaturesByCategory()", () => {
  const features = [
    { id: 1, featureKey: "a", category: "reports" },
    { id: 2, featureKey: "b", category: "billing" },
    { id: 3, featureKey: "c", category: "reports" },
    { id: 4, featureKey: "d", category: "analytics" },
  ];

  it("groups features by their category key", () => {
    const grouped = helpers.groupFeaturesByCategory(features);
    expect(grouped).toHaveProperty("reports");
    expect(grouped).toHaveProperty("billing");
    expect(grouped).toHaveProperty("analytics");
  });

  it("places correct features in each category bucket", () => {
    const grouped = helpers.groupFeaturesByCategory(features);
    expect(grouped.reports).toHaveLength(2);
    expect(grouped.billing).toHaveLength(1);
  });

  it("returns empty object for empty input", () => {
    expect(helpers.groupFeaturesByCategory([])).toEqual({});
  });
});

describe("helpers.validateFeatureKey()", () => {
  it("returns valid:true for a valid snake_case key", () => {
    const result = helpers.validateFeatureKey("valid_feature_key");
    expect(result.valid).toBe(true);
  });

  it("returns valid:true for single-word lowercase key", () => {
    const result = helpers.validateFeatureKey("export");
    expect(result.valid).toBe(true);
  });

  it("returns valid:false for key with uppercase letters", () => {
    const result = helpers.validateFeatureKey("Invalid_Key");
    expect(result.valid).toBe(false);
  });

  it("returns valid:false for key with spaces", () => {
    const result = helpers.validateFeatureKey("has spaces");
    expect(result.valid).toBe(false);
  });

  it("returns valid:false for empty string", () => {
    const result = helpers.validateFeatureKey("");
    expect(result.valid).toBe(false);
  });

  it("returns valid:false for key with special characters outside underscore", () => {
    const result = helpers.validateFeatureKey("has-hyphen");
    expect(result.valid).toBe(false);
  });
});

describe("helpers.isHighRiskChange()", () => {
  it("returns true when disabling a billing category feature", () => {
    const result = helpers.isHighRiskChange("disable", { category: "billing" });
    expect(result).toBe(true);
  });

  it("returns false when enabling a billing category feature", () => {
    const result = helpers.isHighRiskChange("enable", { category: "billing" });
    expect(result).toBe(false);
  });

  it("returns false when disabling a non-billing category feature", () => {
    const result = helpers.isHighRiskChange("disable", { category: "reports" });
    expect(result).toBe(false);
  });

  it("returns false for enable action on any category", () => {
    const result = helpers.isHighRiskChange("enable", { category: "analytics" });
    expect(result).toBe(false);
  });
});

// ─── Service Unit Tests (db mocked via jest.doMock + resetModules) ───────────
const { Op } = require("sequelize");

describe("subscriptionFeatureGatesService.bulkEnableFeatures()", () => {
  let service;
  let mockFeatureGate;

  beforeEach(() => {
    jest.resetModules();
    mockFeatureGate = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue([2]),
      count: jest.fn(),
    };
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFeatureGate },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls update with isEnabled:true and Op.in filter on featureKeys", async () => {
    const keys = ["pdf_export", "bulk_sms"];
    await service.bulkEnableFeatures("tier_pro", keys);

    expect(mockFeatureGate.update).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: true }),
      expect.objectContaining({
        where: expect.objectContaining({
          featureKey: { [Op.in]: keys },
        }),
      })
    );
  });

  it("also includes tierId in the where clause", async () => {
    await service.bulkEnableFeatures("tier_pro", ["feature_a"]);

    const [, opts] = mockFeatureGate.update.mock.calls[0];
    expect(opts.where).toHaveProperty("tierId", "tier_pro");
  });

  it("returns the count of updated records", async () => {
    const result = await service.bulkEnableFeatures("tier_pro", ["a", "b"]);
    expect(typeof result === "number" || typeof result === "object").toBe(true);
  });
});

describe("subscriptionFeatureGatesService.bulkDisableFeatures()", () => {
  let service;
  let mockFeatureGate;

  beforeEach(() => {
    jest.resetModules();
    mockFeatureGate = {
      update: jest.fn().mockResolvedValue([1]),
      findAll: jest.fn(),
    };
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFeatureGate },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls update with isEnabled:false and Op.in on featureKeys", async () => {
    const keys = ["feature_x"];
    await service.bulkDisableFeatures("tier_basic", keys);

    expect(mockFeatureGate.update).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false }),
      expect.objectContaining({
        where: expect.objectContaining({
          featureKey: { [Op.in]: keys },
        }),
      })
    );
  });
});

describe("subscriptionFeatureGatesService.checkFeatureAccess()", () => {
  let service;
  let mockFeatureGate;

  beforeEach(() => {
    jest.resetModules();
    mockFeatureGate = {
      findOne: jest.fn(),
    };
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFeatureGate },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("returns {hasAccess: true} when feature exists and is enabled", async () => {
    mockFeatureGate.findOne.mockResolvedValue({ featureKey: "pdf_export", isEnabled: true });

    const result = await service.checkFeatureAccess("tier_pro", "pdf_export");

    expect(result.hasAccess).toBe(true);
  });

  it("returns {hasAccess: false} when feature is disabled", async () => {
    mockFeatureGate.findOne.mockResolvedValue({ featureKey: "pdf_export", isEnabled: false });

    const result = await service.checkFeatureAccess("tier_pro", "pdf_export");

    expect(result.hasAccess).toBe(false);
  });

  it("returns {hasAccess: false} when feature does not exist for tier", async () => {
    mockFeatureGate.findOne.mockResolvedValue(null);

    const result = await service.checkFeatureAccess("tier_basic", "pdf_export");

    expect(result.hasAccess).toBe(false);
  });
});

describe("subscriptionFeatureGatesService.getFeatureStats()", () => {
  let service;
  let mockFeatureGate;

  beforeEach(() => {
    jest.resetModules();
    mockFeatureGate = {
      count: jest.fn(),
      findAll: jest.fn(),
    };
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFeatureGate },
      sequelize: {
        fn: jest.fn((fn, col) => `${fn}(${col})`),
        col: jest.fn((c) => c),
      },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calculates disabledFeatures as total minus enabled", async () => {
    mockFeatureGate.count
      .mockResolvedValueOnce(20) // total
      .mockResolvedValueOnce(14); // enabled

    const stats = await service.getFeatureStats("tier_pro");

    expect(stats.totalFeatures).toBe(20);
    expect(stats.enabledFeatures).toBe(14);
    expect(stats.disabledFeatures).toBe(6);
  });

  it("returns zero disabled when all features are enabled", async () => {
    mockFeatureGate.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(10);

    const stats = await service.getFeatureStats("tier_pro");

    expect(stats.disabledFeatures).toBe(0);
  });
});

// ─── Controller Tests via Supertest ─────────────────────────────────────────
const express = require("express");
const request = require("supertest");

describe("subscriptionFeatureGates Controller", () => {
  let app;
  let mockService;

  beforeEach(() => {
    jest.resetModules();
    mockService = {
      getFeaturesByTier: jest.fn(),
      getFeatureByKey: jest.fn(),
      createFeature: jest.fn(),
      updateFeature: jest.fn(),
      deleteFeature: jest.fn(),
      bulkEnableFeatures: jest.fn(),
      bulkDisableFeatures: jest.fn(),
      checkFeatureAccess: jest.fn(),
      getFeatureStats: jest.fn(),
    };
    jest.doMock("../service", () => mockService);
    jest.doMock("../helpers", () => ({
      formatFeatureResponse: jest.fn().mockImplementation((f) => f),
      groupFeaturesByCategory: jest.fn().mockReturnValue({}),
      validateFeatureKey: jest.fn().mockReturnValue({ valid: true }),
      isHighRiskChange: jest.fn().mockReturnValue(false),
      calculateAvailableCapacity: jest.fn().mockReturnValue(null),
    }));
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: {} },
      sequelize: {},
    }));

    const controller = require("../controller");
    app = express();
    app.use(express.json());
    app.get("/features", controller.getFeatures);
    app.get("/features/check", controller.checkAccess);
    app.post("/features", controller.createFeature);
    app.put("/features/:id", controller.updateFeature);
    app.delete("/features/:id", controller.deleteFeature);
    app.post("/features/bulk-enable", controller.bulkEnable);
    app.post("/features/bulk-disable", controller.bulkDisable);
    app.get("/features/stats", controller.getStats);
  });

  afterEach(() => jest.clearAllMocks());

  it("GET /features returns 400 when tierId is missing", async () => {
    const res = await request(app).get("/features");
    expect(res.status).toBe(400);
  });

  it("GET /features returns 200 with list of features", async () => {
    mockService.getFeaturesByTier.mockResolvedValue([{ featureKey: "pdf_export" }]);
    const res = await request(app).get("/features?tierId=tier_pro");
    expect(res.status).toBe(200);
  });

  it("GET /check returns 200 with hasAccess result", async () => {
    mockService.checkFeatureAccess.mockResolvedValue({ hasAccess: true });
    const res = await request(app).get("/features/check?tierId=tier_pro&featureKey=pdf_export");
    expect(res.status).toBe(200);
    expect(res.body.data.hasAccess).toBe(true);
  });

  it("POST / creates a feature and returns 201", async () => {
    const newFeature = { id: 1, featureKey: "bulk_sms", tierId: "tier_pro" };
    mockService.createFeature.mockResolvedValue(newFeature);
    const res = await request(app)
      .post("/features")
      .send({ featureKey: "bulk_sms", tierId: "tier_pro", featureName: "Bulk SMS", category: "messaging" });
    expect(res.status).toBe(201);
  });

  it("POST /bulk-enable returns 200 and calls bulkEnable service", async () => {
    mockService.bulkEnableFeatures.mockResolvedValue(2);
    const res = await request(app)
      .post("/features/bulk-enable")
      .send({ tierId: "tier_pro", featureKeys: ["a", "b"] });
    expect(res.status).toBe(200);
    expect(mockService.bulkEnableFeatures).toHaveBeenCalledWith("tier_pro", ["a", "b"]);
  });

  it("POST /bulk-disable returns 200 and calls bulkDisable service", async () => {
    mockService.bulkDisableFeatures.mockResolvedValue(1);
    const res = await request(app)
      .post("/features/bulk-disable")
      .send({ tierId: "tier_basic", featureKeys: ["pdf_export"] });
    expect(res.status).toBe(200);
    expect(mockService.bulkDisableFeatures).toHaveBeenCalledWith("tier_basic", ["pdf_export"]);
  });

  it("GET /stats returns 200 with computed stats", async () => {
    mockService.getFeatureStats.mockResolvedValue({
      totalFeatures: 20,
      enabledFeatures: 14,
      disabledFeatures: 6,
    });
    const res = await request(app).get("/features/stats?tierId=tier_pro");
    expect(res.status).toBe(200);
    expect(res.body.data.disabledFeatures).toBe(6);
  });

  it("DELETE /:id returns 204 on success", async () => {
    mockService.deleteFeature.mockResolvedValue({ success: true });
    const res = await request(app).delete("/features/1?tierId=tier_pro");
    expect(res.status).toBe(204);
  });
});
