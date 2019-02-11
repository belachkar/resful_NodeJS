const environments = {};

environments.statging = {
  httpPort: 3000,
  httpsPort: 3001,
  hashingSecret: 'StatgingSecret',
  envName: 'staging',
  maxChecks: 5,
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  hashingSecret: 'ProductionSecret',
  envName: 'production',
  maxChecks: 5,
};

const currentEnv = typeof (process.env.NODE_ENV) === 'string' ?
  process.env.NODE_ENV.toLowerCase() :
  '';

const environmentToExport = typeof (environments[currentEnv]) == 'object' ?
  environments[currentEnv] :
  environments.statging;

module.exports = environmentToExport;
