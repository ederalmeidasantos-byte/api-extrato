function readPackage(pkg, context) {
  // Override the manifest of foo@1.x after downloading it from the registry
  if (pkg.name === 'foo' && pkg.version.startsWith('1.')) {
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies.bar = '^1.0.0';
    context.log('bar added as dependency to foo@1.x');
  }
  
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};



