/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // tsconfig.json has jsx:"preserve" (Next.js); tests need real JSX transform.
        tsconfig: "tsconfig.jest.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^bson$": "<rootDir>/node_modules/bson/lib/bson.cjs",
    "^marked$": "<rootDir>/node_modules/marked/lib/marked.umd.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(bson|mongodb|mongoose)/)",
  ],
  collectCoverageFrom: [
    "src/lib/content-analytics.ts",
    "src/lib/content-quality.ts",
    "src/lib/content-repurposer.ts",
    "src/lib/content-orchestrator.ts",
    "src/lib/social-adapters/*.ts",
    "!src/lib/content-agent-tools.ts",
  ],
};
