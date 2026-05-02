module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/src/**/*.test.ts', '**/src/**/*.spec.ts'],
  collectCoverageFrom: ['src/lib/**/*.ts'],
  coverageReporters: ['text', 'lcov'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
