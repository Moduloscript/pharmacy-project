const NodeEnvironment = require('jest-environment-node').TestEnvironment;

class CustomEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    
    // Mock localStorage before anything else runs
    this.global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
    
    this.global.sessionStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
  }
}

module.exports = CustomEnvironment;
