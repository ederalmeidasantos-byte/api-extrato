module.exports = {
  '*.js': [
    'eslint --fix',
    'prettier --write',
    'git add'
  ],
  '*.{json,md,yml,yaml}': [
    'prettier --write',
    'git add'
  ],
  '*.{js,json,md,yml,yaml}': [
    'prettier --write',
    'git add'
  ]
};



