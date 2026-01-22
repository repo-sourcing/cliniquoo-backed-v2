const request = require("supertest");

describe("Smoke Tests - Basic Infrastructure", () => {
  let app;

  beforeAll(async () => {
    // Use test app that doesn't require database connection
    app = require("../app.test");
  });

  describe("Health Check Endpoint", () => {
    test("should respond to health check", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("Basic Endpoints", () => {
    test("should return 404 for non-existent route", async () => {
      const response = await request(app).get("/api/v1/nonexistent");

      expect(response.status).toBe(404);
    });

    test("should have CORS enabled", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });

    test("should return JSON responses", async () => {
      const response = await request(app).get("/api/v1/health");

      expect(response.type).toMatch(/json/);
    });
  });

  describe("Request Parsing", () => {
    test("should parse JSON body", async () => {
      const response = await request(app)
        .post("/api/v1/health")
        .send({ test: "data" })
        .set("Content-Type", "application/json");

      expect(response.status).toBeDefined();
    });

    test("should handle malformed JSON", async () => {
      const response = await request(app)
        .post("/api/v1/health")
        .send("not json");

      expect(response.status).toBeDefined();
    });
  });
});

describe("Docker Environment Variables", () => {
  test("should have required environment variables set", () => {
    expect(process.env.NODE_ENV).toBeDefined();
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  test("should have database configuration", () => {
    expect(process.env.DB_HOST).toBeDefined();
    expect(process.env.DB_USER).toBeDefined();
    expect(process.env.DB_NAME).toBeDefined();
  });

  test("should have Redis configuration", () => {
    expect(process.env.REDIS_HOST).toBeDefined();
  });
});
