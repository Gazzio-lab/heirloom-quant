/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@calculators/(.*)$': '<rootDir>/src/calculators/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1'
  },
  collectCoverageFrom: [
    'src/core/**/*.ts',
    'src/calculators/**/*.ts'
  ]
};
