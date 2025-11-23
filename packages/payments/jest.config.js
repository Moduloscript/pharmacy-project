module.exports = {
  preset: 'ts-jest',
  testEnvironment: '<rootDir>/jest-environment.js',
  moduleNameMapper: {
    '^@repo/(.*)$': '<rootDir>/../$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/provider/**/__tests__/**/*.test.ts',
  ],
};
