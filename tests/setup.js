// Test setup and configuration
require("dotenv").config({ path: ".env.example" });

// Set test environment
process.env.NODE_ENV = "test";
process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.REDIS_HOST = process.env.REDIS_HOST || "localhost";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

// Increase test timeout
jest.setTimeout(15000);

// Mock console if needed
if (process.env.SUPPRESS_LOGS === "true") {
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}
