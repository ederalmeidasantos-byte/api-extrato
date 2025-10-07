module.exports = {
  hooks: {
    'pre-commit': [
      'lint-staged',
      'npm run test'
    ],
    'pre-push': [
      'npm run test',
      'npm run lint'
    ],
    'commit-msg': 'commitlint -E HUSKY_GIT_PARAMS'
  }
};



