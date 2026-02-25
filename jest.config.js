/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['routes/**/*.ts', 'middleware/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  verbose: true,
};
