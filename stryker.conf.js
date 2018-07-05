module.exports = (config) => {
  config.set({
    testRunner: 'mocha',
    mutator: 'javascript',
    transpilers: [],
    reporter: ['clear-text', 'progress'],
    testFramework: 'mocha',
    coverageAnalysis: 'perTest',
    mutate: ['src/**/*.js'],
    mochaOptions: {
      files: ['tests/**/**/*.spec.js']
    }
  });
};
