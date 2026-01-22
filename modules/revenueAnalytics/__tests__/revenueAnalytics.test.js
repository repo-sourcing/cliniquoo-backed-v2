"use strict";

// ─── Helper Unit Tests (no mocking — pure logic) ────────────────────────────
const helpers = require("../helpers");

describe("formatCurrency()", () => {
  it("rounds to 2 decimal places", () => {
    expect(helpers.formatCurrency(1000.005)).toBe(1000.01);
    expect(helpers.formatCurrency(2.5)).toBe(2.5);
    expect(helpers.formatCurrency(0)).toBe(0);
  });

  it("handles large amounts", () => {
    expect(helpers.formatCurrency(1234567.89)).toBe(1234567.89);
  });
});

describe("calculatePercentage()", () => {
  it("returns correct percentage", () => {
    expect(helpers.calculatePercentage(25, 100)).toBe(25);
    expect(helpers.calculatePercentage(1, 3)).toBe(33.33);
  });

  it("returns 0 when total is 0 (avoids division by zero)", () => {
    expect(helpers.calculatePercentage(50, 0)).toBe(0);
  });

  it("returns 100 when part equals total", () => {
    expect(helpers.calculatePercentage(500, 500)).toBe(100);
  });
});

describe("fillDateGaps()", () => {
  it("inserts zero-value entries for missing dates within range", () => {
    const data = [
      { date: "2024-01-01", total: 100, cash: 80, online: 20, count: 2 },
      { date: "2024-01-03", total: 200, cash: 150, online: 50, count: 3 },
    ];
    const result = helpers.fillDateGaps(data, "2024-01-01", "2024-01-03", "date");
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual(
      expect.objectContaining({ date: "2024-01-02", total: 0, cash: 0, online: 0, count: 0 })
    );
  });

  it("returns data in ascending date order", () => {
    const data = [{ date: "2024-01-03", total: 50, cash: 50, online: 0, count: 1 }];
    const result = helpers.fillDateGaps(data, "2024-01-01", "2024-01-03", "date");
    expect(result[0].date).toBe("2024-01-01");
    expect(result[2].date).toBe("2024-01-03");
  });

  it("returns empty array when from > to", () => {
    const result = helpers.fillDateGaps([], "2024-01-10", "2024-01-01", "date");
    expect(result).toHaveLength(0);
  });

  it("preserves existing data entry values", () => {
    const data = [{ date: "2024-02-05", total: 999, cash: 500, online: 499, count: 7 }];
    const result = helpers.fillDateGaps(data, "2024-02-05", "2024-02-05", "date");
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(999);
  });
});

// ─── Service Unit Tests (mock Transaction model only) ───────────────────────
jest.mock("../../../modules/transaction/model", () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
}));
jest.mock("../../../modules/patientBill/model", () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
}));

const Transaction = require("../../../modules/transaction/model");
const service = require("../service");

afterEach(() => jest.clearAllMocks());

describe("RevenueAnalyticsService.getSummary()", () => {
  it("returns formatted totals from Transaction aggregate query", async () => {
    Transaction.findOne.mockResolvedValue({
      totalAmount: 1500.005,  // formatCurrency should round to 1500.01
      cashAmount: 1000.005,   // formatCurrency should round to 1000.01
      onlineAmount: 500.005,  // formatCurrency should round to 500.01
    });
    Transaction.count.mockResolvedValue(12);

    const result = await service.getSummary(1);

    expect(Transaction.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clinicId: 1 }) })
    );
    // Values should be rounded via formatCurrency — a wrong impl returning raw amounts fails here
    expect(result.total).toBe(1500.01);
    expect(result.cash).toBe(1000.01);
    expect(result.online).toBe(500.01);
    expect(result.count).toBe(12);
  });

  it("returns zero values when there are no transactions", async () => {
    Transaction.findOne.mockResolvedValue(null);
    Transaction.count.mockResolvedValue(0);

    const result = await service.getSummary(99);

    expect(result.total).toBe(0);
    expect(result.outstanding).toBe(0);
  });
});

describe("RevenueAnalyticsService.getDailyRevenue()", () => {
  it("returns array with date gaps filled in", async () => {
    Transaction.findAll.mockResolvedValue([
      { date: "2024-01-01", totalAmount: 500, cashAmount: 400, onlineAmount: 100, count: "3" },
    ]);

    const result = await service.getDailyRevenue(1, "2024-01-01", "2024-01-03");

    expect(Transaction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clinicId: 1 }) })
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].total).toBe(500);
    expect(result[0].date).toBe("2024-01-01");
    expect(result).toHaveLength(3); // fillDateGaps adds Jan 02 and Jan 03
    expect(result[1].total).toBe(0); // gap-filled entry
  });
});

describe("RevenueAnalyticsService.getMonthlyRevenue()", () => {
  it("always returns exactly 12 months with mock month 3 data", async () => {
    Transaction.findAll.mockResolvedValue([
      { month: 3, totalAmount: 2000, cashAmount: 1500, onlineAmount: 500, count: "10" },
    ]);

    const result = await service.getMonthlyRevenue(1, 2024);

    expect(result).toHaveLength(12);
    // month 3 (index 2) should reflect the mock data total of 2000
    expect(result[2].total).toBe(2000);
  });

  it("includes zero values for months with no transactions", async () => {
    Transaction.findAll.mockResolvedValue([]);

    const result = await service.getMonthlyRevenue(1, 2024);

    expect(result).toHaveLength(12);
    expect(result[0].total).toBe(0);
  });
});

describe("RevenueAnalyticsService.getTrend()", () => {
  it("calculates positive growth percentage correctly", async () => {
    Transaction.findOne
      .mockResolvedValueOnce({ total: 1000 })   // period1
      .mockResolvedValueOnce({ total: 1200 });  // period2

    const result = await service.getTrend(1, "2024-01-01", "2024-01-31", "2024-02-01", "2024-02-29");

    expect(parseFloat(result.growth)).toBe(20);
    expect(result.growthTrend).toBe("up");
  });

  it("calculates negative growth for declining revenue", async () => {
    Transaction.findOne
      .mockResolvedValueOnce({ total: 2000 })
      .mockResolvedValueOnce({ total: 1600 });

    const result = await service.getTrend(1, "2024-01-01", "2024-01-31", "2024-02-01", "2024-02-29");

    expect(parseFloat(result.growth)).toBe(-20);
    expect(result.growthTrend).toBe("down");
  });

  it("returns flat trend when period1 total is 0", async () => {
    Transaction.findOne
      .mockResolvedValueOnce({ total: 0 })
      .mockResolvedValueOnce({ total: 500 });

    const result = await service.getTrend(1, "2024-01-01", "2024-01-31", "2024-02-01", "2024-02-29");

    expect(result.growthTrend).toBe("flat");
  });
});

describe("RevenueAnalyticsService.getBreakdown()", () => {
  it("calculates cash and online percentages correctly", async () => {
    Transaction.findOne.mockResolvedValue({ cashAmount: 750, onlineAmount: 250 });

    const result = await service.getBreakdown(1, "2024-01-01", "2024-01-31");

    expect(result.cashPercentage).toBe(75);
    expect(result.onlinePercentage).toBe(25);
    expect(result.total).toBe(1000);
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
  app.get("/revenueAnalytics/:clinicId/summary", controller.getSummary);
  app.get("/revenueAnalytics/:clinicId/daily", controller.getDaily);
  app.get("/revenueAnalytics/:clinicId/monthly", controller.getMonthly);
  app.get("/revenueAnalytics/:clinicId/breakdown", controller.getBreakdown);
  app.get("/revenueAnalytics/:clinicId/outstanding", controller.getOutstanding);
  app.get("/revenueAnalytics/:clinicId/trend", controller.getTrend);
  return app;
}

describe("GET /revenueAnalytics/:clinicId/summary", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 200 with summary data for a valid clinicId", async () => {
    mockedService.getSummary.mockResolvedValue({ total: 5000, cash: 3000, online: 2000, outstanding: 0, count: 20 });
    const res = await request(app).get("/revenueAnalytics/1/summary");
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(5000);
    expect(mockedService.getSummary).toHaveBeenCalledWith(1);
  });

  it("returns 400 when clinicId is not a valid number", async () => {
    const res = await request(app).get("/revenueAnalytics/abc/summary");
    expect(res.status).toBe(400);
  });
});

describe("GET /revenueAnalytics/:clinicId/daily", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 200 with daily array", async () => {
    mockedService.getDailyRevenue.mockResolvedValue([{ date: "2024-01-01", total: 100 }]);
    const res = await request(app).get("/revenueAnalytics/1/daily?from=2024-01-01&to=2024-01-07");
    expect(res.status).toBe(200);
    expect(mockedService.getDailyRevenue).toHaveBeenCalledWith(
      1,
      expect.stringContaining("2024-01-01"),
      expect.stringContaining("2024-01-07")
    );
  });
});

describe("GET /revenueAnalytics/:clinicId/monthly", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 200 with 12-month array", async () => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }));
    mockedService.getMonthlyRevenue.mockResolvedValue(months);
    const res = await request(app).get("/revenueAnalytics/1/monthly?year=2024");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(12);
    expect(mockedService.getMonthlyRevenue).toHaveBeenCalledWith(1, 2024);
  });
});

describe("GET /revenueAnalytics/:clinicId/trend", () => {
  let app;
  beforeEach(() => { app = buildApp(); jest.clearAllMocks(); });

  it("returns 200 with growth data", async () => {
    mockedService.getTrend.mockResolvedValue({ period1: 1000, period2: 1200, growth: "20.00", growthTrend: "up" });
    const res = await request(app)
      .get("/revenueAnalytics/1/trend?period1From=2024-01-01&period1To=2024-01-31&period2From=2024-02-01&period2To=2024-02-29");
    expect(res.status).toBe(200);
    expect(res.body.data.growthTrend).toBe("up");
    expect(mockedService.getTrend).toHaveBeenCalledWith(
      1,
      expect.stringContaining("2024-01-01"),
      expect.stringContaining("2024-01-31"),
      expect.stringContaining("2024-02-01"),
      expect.stringContaining("2024-02-29")
    );
  });
});

// ─── Additional Service Tests ────────────────────────────────────────────────

describe("RevenueAnalyticsService.getBreakdown() extended", () => {
  it("queries Transaction with correct where clause and returns formatted result", async () => {
    Transaction.findOne.mockResolvedValue({
      cashAmount: 800,
      onlineAmount: 200,
    });

    const result = await service.getBreakdown(1, "2024-01-01", "2024-01-31");

    expect(Transaction.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clinicId: 1,
          createdAt: expect.objectContaining({}),  // date range must be present in WHERE
        }),
      })
    );
    expect(result.total).toBe(1000);
    expect(result.cashPercentage).toBe(80);
    expect(result.onlinePercentage).toBe(20);
  });

  it("throws wrapped error on DB failure", async () => {
    Transaction.findOne.mockRejectedValue(new Error("DB error"));

    await expect(service.getBreakdown(1, "2024-01-01", "2024-01-31")).rejects.toThrow(
      "Failed to fetch revenue breakdown"
    );
  });
});

describe("RevenueAnalyticsService.getOutstanding()", () => {
  it("returns only transactions where paid < amount", async () => {
    Transaction.findAll.mockResolvedValue([
      { id: 1, amount: 500, cash: 200, online: 100, createdAt: new Date(), notes: "partial" },
      { id: 2, amount: 300, cash: 300, online: 0, createdAt: new Date(), notes: "paid" },
    ]);

    const result = await service.getOutstanding(1, "2024-01-01", "2024-01-31");

    expect(Transaction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: 1 }),
        order: [["createdAt", "DESC"]],
        limit: 100,
      })
    );
    // Only the first tx is outstanding (paid 300 < amount 500)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].outstanding).toBe(200);
  });

  it("returns empty array when all transactions are fully paid", async () => {
    Transaction.findAll.mockResolvedValue([
      { id: 1, amount: 100, cash: 100, online: 0, createdAt: new Date(), notes: null },
    ]);

    const result = await service.getOutstanding(1, "2024-01-01", "2024-01-31");

    expect(result).toHaveLength(0);
  });

  it("includes outstandingPercentage in each result", async () => {
    Transaction.findAll.mockResolvedValue([
      { id: 3, amount: 400, cash: 100, online: 0, createdAt: new Date(), notes: "test" },
    ]);

    const result = await service.getOutstanding(1, "2024-01-01", "2024-01-31");

    expect(result[0].outstandingPercentage).toBe(75);
    expect(result[0].paid).toBe(100);
  });

  it("throws wrapped error on DB failure", async () => {
    Transaction.findAll.mockRejectedValue(new Error("connection lost"));

    await expect(service.getOutstanding(1, "2024-01-01", "2024-01-31")).rejects.toThrow(
      "Failed to fetch outstanding revenue"
    );
  });
});

// ─── Additional Controller Tests (using route params matching the real controller) ──

function buildAppC() {
  const express = require("express");
  const app = express();
  app.use(express.json());
  const controller = require("../controller");
  app.get("/revenueAnalytics/:clinicId/breakdown", controller.getBreakdown);
  app.get("/revenueAnalytics/:clinicId/outstanding", controller.getOutstanding);
  app.get("/revenueAnalytics/:clinicId/summary", controller.getSummary);
  app.get("/revenueAnalytics/:clinicId/daily", controller.getDaily);
  return app;
}

describe("GET /revenueAnalytics/:clinicId/breakdown", () => {
  let app;
  beforeEach(() => {
    app = buildAppC();
    jest.clearAllMocks();
  });

  it("returns 200 with breakdown data", async () => {
    mockedService.getBreakdown.mockResolvedValue({
      cash: 800,
      online: 200,
      total: 1000,
      cashPercentage: 80,
      onlinePercentage: 20,
    });

    const res = await request(app).get(
      "/revenueAnalytics/1/breakdown?from=2024-01-01&to=2024-01-31"
    );

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1000);
    expect(res.body.data.cashPercentage).toBe(80);
    expect(mockedService.getBreakdown).toHaveBeenCalledWith(
      1,
      expect.stringContaining("2024-01-01"),
      expect.stringContaining("2024-01-31")
    );
  });

  it("returns 500 on service error", async () => {
    mockedService.getBreakdown.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get(
      "/revenueAnalytics/1/breakdown?from=2024-01-01&to=2024-01-31"
    );

    expect(res.status).toBe(500);
  });
});

describe("GET /revenueAnalytics/:clinicId/outstanding", () => {
  let app;
  beforeEach(() => {
    app = buildAppC();
    jest.clearAllMocks();
  });

  it("returns 200 with list of outstanding transactions", async () => {
    mockedService.getOutstanding.mockResolvedValue([
      { id: 1, amount: 500, paid: 200, outstanding: 300, outstandingPercentage: 60 },
    ]);

    const res = await request(app).get(
      "/revenueAnalytics/1/outstanding?from=2024-01-01&to=2024-01-31"
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].outstanding).toBe(300);
    expect(mockedService.getOutstanding).toHaveBeenCalledWith(
      1,
      expect.stringContaining("2024-01-01"),
      expect.stringContaining("2024-01-31")
    );
  });

  it("returns 200 with empty array when no outstanding transactions", async () => {
    mockedService.getOutstanding.mockResolvedValue([]);

    const res = await request(app).get(
      "/revenueAnalytics/1/outstanding?from=2024-01-01&to=2024-01-31"
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns 500 on service error", async () => {
    mockedService.getOutstanding.mockRejectedValue(new Error("query failed"));

    const res = await request(app).get(
      "/revenueAnalytics/1/outstanding?from=2024-01-01&to=2024-01-31"
    );

    expect(res.status).toBe(500);
  });
});

describe("GET /revenueAnalytics/:clinicId/daily - service call verified", () => {
  let app;
  beforeEach(() => {
    app = buildAppC();
    jest.clearAllMocks();
  });

  it("passes clinicId and date range to service.getDailyRevenue", async () => {
    const dailyData = [
      { date: "2024-01-01", total: 500, cash: 400, online: 100, count: 3 },
      { date: "2024-01-02", total: 0, cash: 0, online: 0, count: 0 },
      { date: "2024-01-03", total: 200, cash: 200, online: 0, count: 1 },
    ];
    mockedService.getDailyRevenue.mockResolvedValue(dailyData);

    const res = await request(app).get(
      "/revenueAnalytics/1/daily?from=2024-01-01&to=2024-01-03"
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(mockedService.getDailyRevenue).toHaveBeenCalledWith(
      1,
      expect.stringContaining("2024-01-01"),
      expect.stringContaining("2024-01-03")
    );
  });
});

// ─── Additional Validation Tests ─────────────────────────────────────────────

const validation = require("../validation");

describe("validateBreakdown()", () => {
  it("accepts valid clinicId, from, and to", () => {
    const { error } = validation.validateBreakdown({ clinicId: 1, from: "2024-01-01", to: "2024-01-31" });
    expect(error).toBeUndefined();
  });

  it("rejects missing clinicId", () => {
    const { error } = validation.validateBreakdown({ from: "2024-01-01", to: "2024-01-31" });
    expect(error).toBeDefined();
  });

  it("rejects missing from date", () => {
    const { error } = validation.validateBreakdown({ clinicId: 1, to: "2024-01-31" });
    expect(error).toBeDefined();
  });
});

describe("validateOutstanding()", () => {
  it("accepts valid clinicId, from, and to", () => {
    const { error } = validation.validateOutstanding({ clinicId: 1, from: "2024-01-01", to: "2024-01-31" });
    expect(error).toBeUndefined();
  });

  it("rejects missing clinicId", () => {
    const { error } = validation.validateOutstanding({ from: "2024-01-01", to: "2024-01-31" });
    expect(error).toBeDefined();
  });
});
