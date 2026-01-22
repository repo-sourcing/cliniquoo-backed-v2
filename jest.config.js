module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js", "**/*.test.js"],
  collectCoverageFrom: [
    "modules/**/*.js",
    "routes/**/*.js",
    "!**/__tests__/**",
    "!**/node_modules/**",
    "!**/migrations/**",
    "!**/config/**",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/migrations/",
    "/config/",
    "__tests__",
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 15000,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
};
