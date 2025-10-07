module.exports = {
  // Presets
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '16'
        },
        modules: 'commonjs',
        useBuiltIns: 'usage',
        corejs: 3
      }
    ]
  ],

  // Plugins
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-runtime'
  ],

  // Environment specific
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            }
          }
        ]
      ]
    },
    development: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: '16'
            },
            modules: 'commonjs',
            useBuiltIns: 'usage',
            corejs: 3
          }
        ]
      ]
    },
    production: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: '16'
            },
            modules: 'commonjs',
            useBuiltIns: 'usage',
            corejs: 3
          }
        ]
      ]
    }
  },

  // Source maps
  sourceMaps: true,

  // Retain lines
  retainLines: true,

  // Comments
  comments: true,

  // Compact
  compact: false,

  // Minified
  minified: false,

  // Source type
  sourceType: 'module',

  // Parser options
  parserOpts: {
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    plugins: [
      'asyncGenerators',
      'bigInt',
      'classPrivateMethods',
      'classPrivateProperties',
      'classProperties',
      'decorators-legacy',
      'doExpressions',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'functionBind',
      'functionSent',
      'importMeta',
      'jsx',
      'logicalAssignment',
      'nullishCoalescingOperator',
      'numericSeparator',
      'objectRestSpread',
      'optionalCatchBinding',
      'optionalChaining',
      'partialApplication',
      'pipelineOperator',
      'placeholders',
      'privateIn',
      'throwExpressions',
      'topLevelAwait',
      'typescript'
    ]
  },

  // Generator options
  generatorOpts: {
    compact: false,
    minified: false,
    comments: true,
    retainLines: true,
    sourceMaps: true,
    sourceMapTarget: 'inline',
    sourceRoot: './',
    sourceFileName: 'index.js'
  }
};



