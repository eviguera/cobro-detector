module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/src/**/*.test.ts', '**/src/**/*.spec.ts'],
  collectCoverageFrom: ['src/lib/**/*.ts'],
  coverageReporters: ['text', 'lcov'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
