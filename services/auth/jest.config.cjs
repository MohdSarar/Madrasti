module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  collectCoverageFrom: ["src/**/*.ts"],
};
