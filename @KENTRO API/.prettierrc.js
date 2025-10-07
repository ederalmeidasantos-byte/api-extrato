module.exports = {
  // Indentação
  tabWidth: 2,
  useTabs: false,
  
  // Quebras de linha
  endOfLine: 'lf',
  printWidth: 80,
  
  // Aspas
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // Ponto e vírgula
  semi: true,
  
  // Espaçamento
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // Arrays e objetos
  trailingComma: 'es5',
  
  // JSX
  jsxSingleQuote: true,
  jsxBracketSameLine: false,
  
  // HTML
  htmlWhitespaceSensitivity: 'css',
  
  // Vue
  vueIndentScriptAndStyle: false,
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // Prose wrap
  proseWrap: 'preserve',
  
  // Range
  rangeStart: 0,
  rangeEnd: Infinity,
  
  // Require pragma
  requirePragma: false,
  
  // Insert pragma
  insertPragma: false,
  
  // Override
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200
      }
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 80
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        useTabs: false
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        useTabs: false
      }
    }
  ]
};



