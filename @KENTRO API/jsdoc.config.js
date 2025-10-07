module.exports = {
  source: {
    include: [
      './',
      './README.md'
    ],
    includePattern: '\\.(js|jsx)$',
    excludePattern: '(node_modules/|test/|coverage/)'
  },
  opts: {
    destination: './docs/',
    recurse: true,
    template: 'node_modules/docdash'
  },
  plugins: [
    'plugins/markdown'
  ],
  templates: {
    cleverLinks: false,
    monospaceLinks: false,
    default: {
      outputSourceFiles: true
    }
  },
  docdash: {
    static: true,
    sort: true,
    meta: {
      title: 'Kentro API Integration',
      description: 'Integração da API Kentro com Sistema Operacional FGTS'
    },
    search: true,
    collapse: false,
    wrap: true,
    typedefs: true,
    removeQuotes: 'none',
    menu: {
      'Github': {
        href: 'https://github.com/lunas-digital/kentro-api-integration',
        target: '_blank',
        class: 'menu-item',
        id: 'repository'
      }
    }
  }
};



