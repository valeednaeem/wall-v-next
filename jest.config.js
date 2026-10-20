/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Object form: ts-jest reads <rootDir>/tsconfig.json and merges these
        // compilerOptions on top. The `jsx` override is REQUIRED for .tsx tests
        // because the project tsconfig uses jsx: "preserve" (Next.js default),
        // which would emit raw JSX that Jest cannot parse. The old top-level
        // `jsx` option was ignored by ts-jest 29.
        tsconfig: {
          jsx: "react-jsx",
        },
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
