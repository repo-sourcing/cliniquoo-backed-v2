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

  it("maps the correct fields onto the returned object", () => {
    const result = helpers.formatFeatureResponse(feature);
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("key");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("category");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("isEnabled");
    expect(result).toHaveProperty("usageLimit");
    expect(result).toHaveProperty("usageUnit");
    expect(result).toHaveProperty("resetFrequency");
    expect(result).toHaveProperty("createdAt");
  });

  it("returns correct values for each field", () => {
    const result = helpers.formatFeatureResponse(feature);
    expect(result.key).toBe("pdf_export");
    expect(result.name).toBe("PDF Export");
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

  it("also includes subscriptionTierId in the where clause", async () => {
    await service.bulkEnableFeatures("tier_pro", ["feature_a"]);

    const [, opts] = mockFeatureGate.update.mock.calls[0];
    expect(opts.where).toHaveProperty("subscriptionTierId", "tier_pro");
  });

  it("returns an object with 'enabled' count of updated records", async () => {
    const result = await service.bulkEnableFeatures("tier_pro", ["a", "b"]);
    expect(result).toHaveProperty("enabled");
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

  it("returns {hasAccess: false} when feature is disabled (query includes isEnabled:true so DB returns null)", async () => {
    // The service queries with isEnabled:true in WHERE; a disabled record would not be returned.
    // We mock null to correctly simulate that the DB found no enabled feature.
    mockFeatureGate.findOne.mockResolvedValue(null);

    const result = await service.checkFeatureAccess("tier_pro", "pdf_export");

    expect(result.hasAccess).toBe(false);
    // Also verify the service actually queries with isEnabled:true — wrong impls that omit this are caught
    expect(mockFeatureGate.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isEnabled: true, featureKey: "pdf_export" }),
      })
    );
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

// ─── Service Unit Tests — additional methods ─────────────────────────────────

function makeServiceMock(overrides = {}) {
  const featureInstance = { id: 1, update: jest.fn().mockResolvedValue({}) };
  const mockFg = {
    findOne: jest.fn().mockResolvedValue(featureInstance),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 10 }),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue([1]),
    ...overrides,
  };
  return { mockFg, featureInstance };
}

describe("subscriptionFeatureGatesService.getAvailableFeatures()", () => {
  let service;
  let mockFg;

  beforeEach(() => {
    jest.resetModules();
    ({ mockFg } = makeServiceMock({
      findAll: jest.fn().mockResolvedValue([
        { id: 1, featureName: "PDF Export", featureKey: "pdf_export", category: "reports",
          description: null, usageLimit: null, usageUnit: null, resetFrequency: "monthly" },
      ]),
    }));
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFg },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("queries with subscriptionTierId and isEnabled:true and returns features array", async () => {
    const result = await service.getAvailableFeatures("tier_pro");
    expect(mockFg.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subscriptionTierId: "tier_pro", isEnabled: true }),
      })
    );
    expect(result.totalFeatures).toBe(1);
    expect(result.features[0].key).toBe("pdf_export");
  });

  it("filters by category when provided", async () => {
    await service.getAvailableFeatures("tier_pro", "reports");
    expect(mockFg.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "reports" }),
      })
    );
  });
});

describe("subscriptionFeatureGatesService.getFeaturesByCategory()", () => {
  let service;
  let mockFg;

  beforeEach(() => {
    jest.resetModules();
    ({ mockFg } = makeServiceMock({
      findAll: jest.fn().mockResolvedValue([
        { id: 2, featureName: "Export CSV", featureKey: "csv_export", usageLimit: 100 },
      ]),
    }));
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFg },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("queries with subscriptionTierId, category and isEnabled:true", async () => {
    const result = await service.getFeaturesByCategory("tier_pro", "reports");
    expect(mockFg.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subscriptionTierId: "tier_pro", category: "reports", isEnabled: true }),
      })
    );
    expect(result[0].key).toBe("csv_export");
  });
});

describe("subscriptionFeatureGatesService.enableFeature()", () => {
  let service;
  let mockFg;
  let featureInstance;

  beforeEach(() => {
    jest.resetModules();
    ({ mockFg, featureInstance } = makeServiceMock());
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFg },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls feature.update({ isEnabled: true }) and returns { success: true }", async () => {
    const result = await service.enableFeature("tier_pro", "pdf_export");
    expect(featureInstance.update).toHaveBeenCalledWith({ isEnabled: true });
    expect(result.success).toBe(true);
  });

  it("throws when feature is not found for the tier", async () => {
    mockFg.findOne.mockResolvedValue(null);
    await expect(service.enableFeature("tier_basic", "missing_key")).rejects.toThrow(/not found/);
  });
});

describe("subscriptionFeatureGatesService.disableFeature()", () => {
  let service;
  let mockFg;
  let featureInstance;

  beforeEach(() => {
    jest.resetModules();
    ({ mockFg, featureInstance } = makeServiceMock());
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFg },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls feature.update({ isEnabled: false }) and returns { success: true }", async () => {
    const result = await service.disableFeature("tier_pro", "pdf_export");
    expect(featureInstance.update).toHaveBeenCalledWith({ isEnabled: false });
    expect(result.success).toBe(true);
  });

  it("throws when feature is not found", async () => {
    mockFg.findOne.mockResolvedValue(null);
    await expect(service.disableFeature("tier_pro", "ghost")).rejects.toThrow(/not found/);
  });
});

describe("subscriptionFeatureGatesService.createFeature()", () => {
  let service;
  let mockFg;

  beforeEach(() => {
    jest.resetModules();
    ({ mockFg } = makeServiceMock({ findOne: jest.fn().mockResolvedValue(null) }));
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFg },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls SubscriptionFeatureGate.create with correct fields", async () => {
    await service.createFeature("tier_pro", {
      featureName: "PDF Export", featureKey: "pdf_export", category: "reports", usageLimit: 50,
    });
    expect(mockFg.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionTierId: "tier_pro",
        featureKey: "pdf_export",
        featureName: "PDF Export",
        isEnabled: true,
      })
    );
  });

  it("throws when a feature with the same key already exists for the tier", async () => {
    mockFg.findOne.mockResolvedValue({ id: 5 }); // duplicate
    await expect(
      service.createFeature("tier_pro", { featureName: "Dup", featureKey: "pdf_export" })
    ).rejects.toThrow(/already exists/);
    expect(mockFg.create).not.toHaveBeenCalled();
  });
});

describe("subscriptionFeatureGatesService.updateFeature()", () => {
  let service;
  let mockFg;
  let featureInstance;

  beforeEach(() => {
    jest.resetModules();
    ({ mockFg, featureInstance } = makeServiceMock());
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFg },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("calls feature.update with only allowed fields, ignoring others", async () => {
    await service.updateFeature(1, "tier_pro", { description: "new desc", featureKey: "evil_override", usageLimit: 10 });
    const updateArg = featureInstance.update.mock.calls[0][0];
    expect(updateArg).toHaveProperty("description", "new desc");
    expect(updateArg).toHaveProperty("usageLimit", 10);
    // featureKey is not in the allowed list — must be filtered out
    expect(updateArg).not.toHaveProperty("featureKey");
  });

  it("throws when feature is not found", async () => {
    mockFg.findOne.mockResolvedValue(null);
    await expect(service.updateFeature(999, "tier_pro", {})).rejects.toThrow(/not found/);
  });
});

describe("subscriptionFeatureGatesService.hasFeatureAccess()", () => {
  let service;
  let mockFg;

  beforeEach(() => {
    jest.resetModules();
    ({ mockFg } = makeServiceMock());
    jest.doMock("../../config/db", () => ({
      models: { SubscriptionFeatureGate: mockFg },
      sequelize: { fn: jest.fn(), col: jest.fn() },
    }));
    service = require("../service");
  });

  afterEach(() => jest.clearAllMocks());

  it("returns true when an enabled feature exists for the tier", async () => {
    mockFg.findOne.mockResolvedValue({ id: 1 });
    const result = await service.hasFeatureAccess("tier_pro", "pdf_export");
    expect(result).toBe(true);
    expect(mockFg.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isEnabled: true }) })
    );
  });

  it("returns false when no enabled feature exists", async () => {
    mockFg.findOne.mockResolvedValue(null);
    const result = await service.hasFeatureAccess("tier_basic", "pdf_export");
    expect(result).toBe(false);
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
      checkFeatureAccess: jest.fn(),
      getAvailableFeatures: jest.fn(),
      createFeature: jest.fn(),
      updateFeature: jest.fn(),
      disableFeature: jest.fn(),
      bulkEnableFeatures: jest.fn(),
      bulkDisableFeatures: jest.fn(),
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
    app.get("/features", controller.getAvailableFeatures);
    app.get("/features/check", controller.checkFeatureAccess);
    app.post("/features", controller.createFeature);
    app.put("/features/:id", controller.updateFeature);
    app.post("/features/disable", controller.disableFeature);
    app.post("/features/bulk-enable", controller.bulkEnableFeatures);
    app.post("/features/bulk-disable", controller.bulkDisableFeatures);
    app.get("/features/stats", controller.getFeatureStats);
  });

  afterEach(() => jest.clearAllMocks());

  it("GET /features returns 400 when subscriptionTierId is missing", async () => {
    const res = await request(app).get("/features");
    expect(res.status).toBe(400);
  });

  it("GET /features returns 200 with list of features", async () => {
    mockService.getAvailableFeatures.mockResolvedValue([{ featureKey: "pdf_export" }]);
    const res = await request(app).get("/features?subscriptionTierId=tier_pro");
    expect(res.status).toBe(200);
  });

  it("GET /check returns 200 with hasAccess result", async () => {
    mockService.checkFeatureAccess.mockResolvedValue({ hasAccess: true });
    const res = await request(app).get("/features/check?subscriptionTierId=tier_pro&featureKey=pdf_export");
    expect(res.status).toBe(200);
    expect(res.body.data.hasAccess).toBe(true);
  });

  it("POST / creates a feature and returns 201", async () => {
    const newFeature = { id: 1, featureKey: "bulk_sms", subscriptionTierId: "tier_pro" };
    mockService.createFeature.mockResolvedValue(newFeature);
    const res = await request(app)
      .post("/features")
      .send({ featureKey: "bulk_sms", subscriptionTierId: "tier_pro", featureName: "Bulk SMS", category: "messaging" });
    expect(res.status).toBe(201);
  });

  it("POST /bulk-enable returns 200 and calls bulkEnableFeatures service", async () => {
    mockService.bulkEnableFeatures.mockResolvedValue({ enabled: 2, message: "2 features enabled" });
    const res = await request(app)
      .post("/features/bulk-enable")
      .send({ subscriptionTierId: "tier_pro", featureKeys: ["a", "b"] });
    expect(res.status).toBe(200);
    expect(mockService.bulkEnableFeatures).toHaveBeenCalledWith("tier_pro", ["a", "b"]);
  });

  it("POST /bulk-disable returns 200 and calls bulkDisableFeatures service", async () => {
    mockService.bulkDisableFeatures.mockResolvedValue({ disabled: 1, message: "1 features disabled" });
    const res = await request(app)
      .post("/features/bulk-disable")
      .send({ subscriptionTierId: "tier_basic", featureKeys: ["pdf_export"] });
    expect(res.status).toBe(200);
    expect(mockService.bulkDisableFeatures).toHaveBeenCalledWith("tier_basic", ["pdf_export"]);
  });

  it("GET /stats returns 200 with computed stats", async () => {
    mockService.getFeatureStats.mockResolvedValue({
      totalFeatures: 20,
      enabledFeatures: 14,
      disabledFeatures: 6,
    });
    const res = await request(app).get("/features/stats?subscriptionTierId=tier_pro");
    expect(res.status).toBe(200);
    expect(res.body.data.disabledFeatures).toBe(6);
  });

  it("POST /disable returns 200 when feature is disabled", async () => {
    mockService.disableFeature.mockResolvedValue({ success: true });
    const res = await request(app)
      .post("/features/disable")
      .send({ subscriptionTierId: "tier_pro", featureKey: "pdf_export" });
    expect(res.status).toBe(200);
  });
});
