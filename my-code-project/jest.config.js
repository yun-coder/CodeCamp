module.exports = {
  // 这里可以使用bail-config选项，让Jest在第一次失败。
  bail: false,

  // 指示是否应在运行期间报告每个单独的测试
  verbose: true,

  // 指示在执行测试时是否应收集覆盖率信息
  collectCoverage: false,

  // Jest应该输出其覆盖范围文件的目录。
  coverageDirectory: './coverage/',

  // 如果测试路径与任何模式匹配，将跳过它
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],

  // 如果文件路径与任何模式匹配，将跳过覆盖率信息。
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/'],

  // Jest用于检测测试文件的模式
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.jsx?$',

  // 此选项设置jsdom环境的URL
  testURL: 'http://localhost:8080',

  // @see: https://jestjs.io/docs/en/configuration#coveragethreshold-object
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 95,
      functions: 100,
      lines: 100,
    },
  },
};
