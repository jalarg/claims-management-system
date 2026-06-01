module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'claims/**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!main.ts',
    '!app.module.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
